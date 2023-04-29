import axios from "axios";
import rateLimit from "axios-rate-limit";
import jaroWinkler from "jaro-winkler";

// Rate limit to 1 request every 2000 milliseconds
const http = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 2000 });

const app = async (event) => {
  try {
    const { token, trackName, year, albumName, artistName } = event;

    console.log(event);

    // Search for the album first
    const album = await searchAlbum(token, albumName, artistName, year);
    if (album) {
      const trackInAlbum = await findTrackInAlbum(token, album, trackName);
      if (trackInAlbum) {
        return { statusCode: 200, body: trackInAlbum };
      }
    }

    // If the album is not found or the track is not in the album, search for tracks in artist's albums
    const individualArtists = splitArtists(artistName);
    for (const individualArtist of individualArtists) {
      if (!isVariousArtist(individualArtist)) {
        const artistData = await search(token, `artist:${individualArtist}`, "artist");
        if (artistData) {
          const trackInArtistAlbums = await findTrackInArtistAlbums(token, artistData, trackName, albumName, artistName, year);
          if (trackInArtistAlbums) {
            return { statusCode: 200, body: trackInArtistAlbums };
          }
        }
      }
    }

    return { statusCode: 404, body: "Track not found." };
  } catch (error) {
    handleError(error, "searching");
    return { statusCode: error.response?.status || 500, body: error.message };
  }
};

// Build headers for API requests
const buildHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

// Sleep function for rate limiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Error handling function
const handleError = (error, context) => {
  console.error(`Error ${context}:`);
  console.log(error.message);
  if (error.response) {
    console.log(error.response.data);
  }
};

// Generic search function for Spotify API
const search = async (token, query, type) => {
  const response = await http.get("https://api.spotify.com/v1/search", {
    headers: buildHeaders(token),
    params: { q: query, type: type, limit: 50, offset: 0 },
  });

  return response.data;
};

// Search for an album using albumName, artistName, and year
const searchAlbum = async (token, albumName, artistName, year) => {
  const response = await search(token, `album:${albumName}`, "album");
  for (const album of response.albums.items) {
    console.log(`searching album; ${album.name} - ${albumName}`);
    const release_year = album.release_date.split("-")[0];
    const includesArtist = album.artists.some((artist) => artist.name.toLowerCase() === artistName.toLowerCase());
    if (album.name.toLowerCase() === albumName.toLowerCase() && (release_year === year || includesArtist)) {
      console.log('album found; ', album.name);
      album.release_year = release_year;
      return album;
    }
  }
};

// Check if the artistName is a various artist
const isVariousArtist = (artistName) => {
  const lowerCaseArtistName = artistName.toLowerCase();

  return ['various artists', 'v/a', 'va'].includes(lowerCaseArtistName) || / [&+]/.test(artistName);
};

// Split artist names by "&" if present
const splitArtists = (artistName) => {
  if (artistName.includes("&")) {
    return artistName.split(" & ");
  }
  return [artistName];
};

// Tokenize a string
const tokenize = (str) => {
  return str.toLowerCase().split(/[\s-]+/);
};

// Check for token overlap between two strings
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

// Compare similarity between two strings using Jaro-Winkler distance and token overlap
const compareStrings = (str1, str2) => {
  const similarity = jaroWinkler(str1, str2, { caseSensitive: false });
  const overlap = tokenOverlap(str1, str2);
  return similarity >= 0.8 || overlap;
};

// Get track with popularity
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

// Find track in the list of tracks using trackName
const findTrack = async (tracks, fullTrackName, token) => {
  let trackNameToFind = fullTrackName;
  if (isVariousArtist(fullTrackName)) {
    const splitTrackName = fullTrackName.split(" - ");
    trackNameToFind = splitTrackName.length > 1 ? splitTrackName[1] : splitTrackName[0];
  }
  for (const track of tracks) {
    console.log(`comparing track: '${track.name}' with '${trackNameToFind}'`);
    const trackNameSimilarity = compareStrings(track.name, trackNameToFind);
    if (trackNameSimilarity) {
      const trackWithPopularity = await getTrackWithPopularity(token, track.id);
      trackWithPopularity.preview_url = track.preview_url;
      return trackWithPopularity;
    }
  }
  return null;
};

// Find a track in a specific album
const findTrackInAlbum = async (token, album, trackName) => {
  const albumTracksResponse = await http.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
    headers: buildHeaders(token),
  });
  const track = await findTrack(albumTracksResponse.data.items, trackName, token);
  if (track) return track;
  return null;
};

// Find a track in artist's albums
const findTrackInArtistAlbums = async (token, artistData, trackName, albumName, artistName, year) => {
  if (artistData.artists?.items) {
    for (const artist of artistData.artists.items) {
      if (artist.name.toLowerCase() !== artistName.toLowerCase()) continue;
      const artistId = artist.id;
      const artistAlbumsResponse = await http.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
        headers: buildHeaders(token),
      });
      await sleep(2000);
      console.log('');
      for (const album of artistAlbumsResponse.data.items) {
        const release_year = album.release_date.split("-")[0];
        console.log(`searching album; ${album.name} - ${albumName}`);
        if (album.name.toLowerCase() === albumName.toLowerCase() && release_year === year) {
          console.log('album found; ', album.name);
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





