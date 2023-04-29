import axios from "axios";
import rateLimit from "axios-rate-limit";
import jaroWinkler from "jaro-winkler";

const http = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 2000 });

const app = async (event) => {
  try {
    const { token, trackName, year, albumName, artistName } = event;

    const album = await searchAlbum(token, albumName, year);
    const trackInAlbum = await findTrackInAlbum(token, album, trackName);
    if (trackInAlbum) {
      return { statusCode: 200, body: trackInAlbum };
    }

    const individualArtists = splitArtists(artistName);
    for (const individualArtist of individualArtists) {
      if (!isVariousArtist(individualArtist)) {
        const artistData = await findArtist(token, individualArtist);
        const trackInArtistAlbums = await findTrackInArtistAlbums(token, artistData, trackName, albumName);
        if (trackInArtistAlbums) {
          return { statusCode: 200, body: trackInArtistAlbums };
        }
      }
    }

    return { statusCode: 404, body: "Track not found." };
  } catch (error) {
    handleError(error, "searching");
    return { statusCode: error.response?.status || 500, body: error.message };
  }
};

const buildHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const handleError = (error, context) => {
  console.error(`Error ${context}:`);
  console.log(error.message);
  if (error.response) {
    console.log(error.response.data);
  }
};

const search = async (token, query, type) => {
  const response = await http.get("https://api.spotify.com/v1/search", {
    headers: buildHeaders(token),
    params: { q: query, type: type, market: "ES", limit: 10, offset: 0 },
  });

  return response.data;
};

const searchAlbum = async (token, albumName, year) => {
  let response = await search(token, `album:${albumName}`, "album");
  for (const album of response.albums.items) {
    const release_year = album.release_date.split("-")[0];
    if (release_year === year) {
      console.log("found album", album.name)
      album.release_year = release_year;
      return album
    }
  }
}

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

const findArtist = async (token, artistName) => {
  try {
    const response = await http.get("https://api.spotify.com/v1/search", {
      headers: buildHeaders(token),
      params: {
        q: `artist:${encodeURIComponent(artistName)}`,
        type: "artist",
      },
    });
    return response.data;
  } catch (error) {
    handleError(error, "findArtist");
    return error;
  }
};

const tokenize = (str) => {
  return str.toLowerCase().split(/[\s\-]+/);
};

const tokenOverlap = (str1, str2) => {
  const tokens1 = new Set(tokenize(str1));
  const tokens2 = new Set(tokenize(str2));
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      return true;
    }
  }
  return false;
};

const compareStrings = (str1, str2) => {
  const similarity = jaroWinkler(str1, str2, { caseSensitive: false });
  const overlap = tokenOverlap(str1, str2);
  return similarity >= 0.8 || overlap;
};

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

const findTrack = async (tracks, fullTrackName, token) => {
  let trackNameToFind = fullTrackName;
  if (isVariousArtist(fullTrackName)) {
    const splitTrackName = fullTrackName.split(" - ");
    trackNameToFind = splitTrackName.length > 1 ? splitTrackName[1] : splitTrackName[0];
  }
  for (const track of tracks) {
    console.log(`comparing track: '${track.name}' with '${trackNameToFind}'`);
    const trackNameSimilarity = compareStrings(track.name, trackNameToFind);
    if (trackNameSimilarity >= 0.8) {
      const trackWithPopularity = await getTrackWithPopularity(token, track.id);
      trackWithPopularity.preview_url = track.preview_url;
      return trackWithPopularity;
    }
  }
  return null;
};

const findTrackInAlbum = async (token, album, trackName) => {
  const albumTracksResponse = await http.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
    headers: buildHeaders(token),
  });
  const track = await findTrack(albumTracksResponse.data.items, trackName, token);
  if (track) return track;
  return null;
};

const findTrackInArtistAlbums = async (token, artistData, trackName, albumName) => {
  if (artistData.artists?.items) {
    for (const artist of artistData.artists.items) {
      const artistId = artist.id;
      const artistAlbumsResponse = await http.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
        headers: buildHeaders(token),
      });
      await sleep(2000);
      for (const album of artistAlbumsResponse.data.items) {
        const albumNameSimilarity = compareStrings(album.name, albumName);
        const albumNameIncludes = album.name.toLowerCase().includes(albumName.toLowerCase());
        if (albumNameSimilarity >= 0.8 || albumNameIncludes) {
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

export { app };

