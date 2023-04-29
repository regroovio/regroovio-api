import axios from "axios";
import rateLimit from "axios-rate-limit";
import jaroWinkler from "jaro-winkler";

const http = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 2000 });


const app = async (event) => {
  try {
    const { trackName, year, albumName, artistName } = event;
    console.log(event);
    const isVA = isVariousArtist(artistName);
    const individualArtists = splitArtists(artistName);
    let track = null;
    for (const individualArtist of individualArtists) {
      if (isVA) {
        const albumData = await search(year, albumName, individualArtist);
        const trackInAlbum = await findTrackInAlbum(albumData, trackName, isVA);
        if (trackInAlbum) {
          track = trackInAlbum;
          break;
        }
      }
      const artistData = await findArtist(individualArtist);
      const trackInArtistAlbums = await findTrackInArtistAlbums(artistData, trackName, albumName);
      if (trackInArtistAlbums) {
        track = trackInArtistAlbums;
        break;
      }
    }
    if (track) {
      return { statusCode: 200, body: track };
    } else {
      return { statusCode: 404, body: "Track not found." };
    }
  } catch (error) {
    handleError(error, "searching");
    return error.response.data.error;
  }
};

const isVariousArtist = (artistName) => {
  const lowerCaseArtistName = artistName.toLowerCase();
  return ['various artists', 'v/a', 'va'].includes(lowerCaseArtistName) || / [&+]/.test(artistName);
};

const splitArtists = (artistName) => {
  if (artistName.includes("&")) {
    return artistName.split(" & ");
  }
  return [artistName];
};

const handleError = (error, context) => {
  console.error(`Error ${context}:`);
  console.log(error.message);
  console.log(error.response.data.error);
};

const findTrackInArtistAlbums = async (artistData, trackName, albumName) => {
  if (artistData.artists?.items) {
    for (const artist of artistData.artists.items) {
      const artistId = artist.id;
      const artistAlbumsResponse = await http.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      });
      await sleep(2000);
      for (const album of artistAlbumsResponse.data.items) {
        const albumNameSimilarity = compareStrings(album.name, albumName);
        const albumNameIncludes = album.name.toLowerCase().includes(albumName.toLowerCase());
        if (albumNameSimilarity >= 0.8 || albumNameIncludes) {
          const albumTracksResponse = await http.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
          });
          await sleep(2000);
          const track = await findTrack(albumTracksResponse.data.items, trackName);
          if (track) return track;
        }
      }
    }
  }
  return null;
};

const search = async (year, albumName, artistName) => {
  try {
    const response = await http.get("https://api.spotify.com/v1/search", {
      params: {
        q: `album:${albumName} artist:${artistName}`,
        type: "album",
      },
    });
    const albums = response.data.albums?.items || [];
    const filteredAlbums = albums.filter((album) => {
      const albumYear = album.release_date?.substring(0, 4);
      const albumNameSimilarity = compareStrings(album.name, albumName);
      const albumNameIncludes = album.name.toLowerCase().includes(albumName.toLowerCase());
      const artistNameSimilarity = compareStrings(album.artists[0]?.name, artistName);
      return (albumYear === year || albumNameSimilarity >= 0.5 || albumNameIncludes) && artistNameSimilarity >= 0.6;
    });
    return filteredAlbums;
  } catch (error) {
    handleError(error, "search");
    return error;
  }
};

const findTrackInAlbum = async (albumData, trackName) => {
  for (const album of albumData) {
    const albumTracksResponse = await http.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
    });
    const track = await findTrack(albumTracksResponse.data.items, trackName);
    if (track) return track;
  }
  return null;
};

const findTrack = async (tracks, fullTrackName) => {
  let trackNameToFind = fullTrackName;
  if (isVariousArtist) {
    const splitTrackName = fullTrackName.split(" - ");
    trackNameToFind = splitTrackName.length > 1 ? splitTrackName[1] : splitTrackName[0];
  }
  for (const track of tracks) {
    console.log(`comparing track: '${track.name}' with '${trackNameToFind}'`);
    const trackNameSimilarity = compareStrings(track.name, trackNameToFind);
    if (trackNameSimilarity >= 0.8) {
      const trackWithPopularity = await getTrackWithPopularity(track.id);
      trackWithPopularity.preview_url = track.preview_url
      console.log(trackWithPopularity);
      return trackWithPopularity;
    }
  }
  return null;
};

const getTrackWithPopularity = async (trackId) => {
  try {
    const response = await http.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
    });
    return response.data;
  } catch (error) {
    handleError(error, "getTrackWithPopularity");
    return error;
  }
};


const findArtist = async (artistName) => {
  try {
    const response = await http.get(`https://api.spotify.com/v1/search`, {
      params: {
        q: artistName,
        type: "artist",
      },
    });
    return response.data;
  } catch (error) {
    handleError(error, "findArtist");
    return error;
  }
};

const compareStrings = (str1, str2) => {
  return jaroWinkler(str1, str2, { caseSensitive: false });
};

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export { app };