import axios from "axios";
import rateLimit from "axios-rate-limit";
import Fuse from "fuse.js";
import { handleError, sleep, buildHeaders } from "./helpers.mjs";

const http = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 2000 });

const app = async (event) => {
  try {
    const { token, trackName, year, albumName, artistName } = event;
    console.log(event);

    const individualArtists = splitArtists(artistName);
    for (const individualArtist of individualArtists) {
      if (!isVariousArtist(individualArtist)) {
        const artistData = await search(token, `artist:${individualArtist}`, "artist", 20);
        if (artistData) {
          const trackInArtistAlbums = await findTrackInArtistAlbums(token, artistData, trackName, artistName, year);
          if (trackInArtistAlbums) {
            return { statusCode: 200, body: trackInArtistAlbums };
          }
        }
      }
    }

    const album = await searchAlbum(token, albumName, artistName, year);
    if (album) {
      const trackInAlbum = await findTrackInAlbum(token, album, trackName, album);
      if (trackInAlbum) {
        return { statusCode: 200, body: trackInAlbum };
      }
    }

    // returns original tracks, might not be the best idea
    // if (trackName.split('-').length) {
    //   for (const word of trackName.split('-')) {
    //     if (!isVariousArtist(word)) {
    //       const artistData = await search(token, `artist:${word}`, "artist", 10);
    //       if (artistData) {
    //         const trackInArtistAlbums = await findTrackInArtistAlbums(token, artistData, trackName, year);
    //         if (trackInArtistAlbums) {
    //           return { statusCode: 200, body: trackInArtistAlbums };
    //         }
    //       }
    //     }
    //   }
    // }

    return { statusCode: 404, body: "Track not found." };
  } catch (error) {
    handleError(error, "searching");
    return { statusCode: error.response?.status || 500, body: error.message };
  }
};

const searchAlbum = async (token, albumName, artistName, year) => {
  const response = await search(token, `album:${albumName}`, "album", 10);
  for (const album of response.albums.items) {
    const release_year = album.release_date.split("-")[0];
    const includesArtist = album.artists.some((artist) => artist.name.toLowerCase() === artistName.toLowerCase());
    if (album.name.toLowerCase() === albumName.toLowerCase() && (release_year === year || includesArtist)) {
      console.log('album found: ', album.name);
      album.release_year = release_year;
      return album;
    }
  }
};

const findTrackInAlbum = async (token, album, trackName) => {
  console.log('findTrackInAlbum');
  const albumTracksResponse = await http.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
    headers: buildHeaders(token),
  });
  const track = await findTrack(albumTracksResponse.data.items, trackName, token);
  if (track) return track;
  return null;
};

const findTrackInArtistAlbums = async (token, artistData, trackName, year) => {
  if (artistData.artists?.items) {
    for (const artist of artistData.artists.items) {
      const artistId = artist.id;
      const artistAlbumsResponse = await http.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
        headers: buildHeaders(token),
      });
      await sleep(2000);
      for (const album of artistAlbumsResponse.data.items) {
        if (album.release_date.split('-')[0] === year) {
          const albumTracksResponse = await http.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
            headers: buildHeaders(token),
          });
          await sleep(2000);
          const track = await findTrack(albumTracksResponse.data.items, trackName, token);
          if (track) return track;
        }
      }
    }
  }
  return null;
};

const findTrack = async (tracks, fullTrackName, token) => {
  let normalizedTrackNames = [fullTrackName]
  if (fullTrackName.split('-').length) {
    normalizedTrackNames = [];
    for (const word of fullTrackName.split('-')) {
      normalizedTrackNames.push(word);
    }
  }
  let results = [];
  let fuse = null;
  for (const normalizedTrackName of normalizedTrackNames) {
    fuse = new Fuse(tracks, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.3,
    });
    results = fuse.search(normalizedTrackName);
    if (results.length > 0) {
      const bestMatch = results[0].item;
      const trackWithPopularity = await getTrackWithPopularity(token, bestMatch.id);
      trackWithPopularity.preview_url = bestMatch.preview_url;
      return trackWithPopularity;
    }
  }
}

const getTrackWithPopularity = async (token, trackId) => {
  try {
    const response = await http.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: buildHeaders(token),
    });
    return response.data;
  } catch (error) {
    handleError(error, "getTrackWithPopularity");
    return error;
  }
};

const search = async (token, query, type, limit) => {
  const response = await http.get("https://api.spotify.com/v1/search", {
    headers: buildHeaders(token),
    params: { q: query, type: type, limit, offset: 0 },
  });
  return response.data;
};

const splitArtists = (artistName) => {
  if (artistName.includes("&")) {
    return artistName.split(" & ");
  }
  return [artistName];
};

const isVariousArtist = (artistName) => {
  const lowerCaseArtistName = artistName.toLowerCase();
  return ['various artists', 'v/a', 'va'].includes(lowerCaseArtistName) || / [&+]/.test(artistName);
};

export { app };