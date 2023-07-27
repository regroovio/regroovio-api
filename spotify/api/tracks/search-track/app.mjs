import axios from "axios";
import rateLimit from "axios-rate-limit";
import { handleError, buildHeaders, sleep } from "./helpers.mjs";

const http = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 2000 });
const retryAttempts = 3;

const app = async (event) => {
  try {
    const { token, trackName, year, albumName, artistName } = event;
    let query = `track:${trackName} album:${albumName} artist:${artistName}`;
    if (year) {
      query = `track:${trackName} album:${albumName} artist:${artistName} year:${year}`;
    }
    let tracks = await search(token, query, "track", 1);
    if (tracks.tracks.items.length > 0) {
      const albumId = tracks.tracks.items[0].album.id;
      const albumTracks = await getAlbumTracks(token, albumId);
      const trackInAlbum = albumTracks.find(track => track.id === tracks.tracks.items[0].id);
      if (trackInAlbum) {
        return { statusCode: 200, body: tracks.tracks.items[0] };
      } else {
        return { statusCode: 404, body: `The requested track does not belong to the specified album.` };
      }
    }

    return { statusCode: 404, body: `The requested track was not found.Please ensure the provided artist name, track name, album name, and year are correct and try again.` };

  } catch (error) {
    handleError(error, "searching");
    return { statusCode: error.response?.status || 500, body: error.message };
  }
};

const search = async (token, query, type, limit) => {
  const headers = buildHeaders(token);
  const params = { q: query, type: type, limit, offset: 0 };

  let attempts = 0;

  while (attempts < retryAttempts) {
    try {
      const response = await http.get("https://api.spotify.com/v1/search", { headers, params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429 && error.response?.headers['retry-after']) {
        const delay = parseInt(error.response?.headers['retry-after']) * 1000;
        console.log(`Rate limited.Retrying after ${delay / 1000} seconds.`);
        await sleep(delay);
        attempts++;
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed to search after ${retryAttempts} attempts.`);
};

const getAlbumTracks = async (token, albumId) => {
  const headers = buildHeaders(token);

  try {
    const response = await http.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, { headers });
    return response.data.items;
  } catch (error) {
    handleError(error, "getAlbumTracks");
    throw error;
  }
};

export { app };



// import axios from "axios";
// import rateLimit from "axios-rate-limit";
// import Fuse from "fuse.js";
// import { handleError, sleep, buildHeaders } from "./helpers.mjs";

// const http = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 2000 });

// const app = async (event) => {
//   try {
//     const { token, trackName, year, albumName, artistName } = event;
//     let message = "";
//     console.log(event);

//     const individualArtists = splitArtists(artistName);
//     for (const individualArtist of individualArtists) {
//       if (!isVariousArtist(individualArtist)) {
//         const artistData = await search(token, `artist:${individualArtist}`, "artist", 20);
//         if (artistData) {
//           const trackInArtistAlbums = await findTrackInArtistAlbums(token, artistData, trackName, artistName, year);
//           if (trackInArtistAlbums) {
//             return { statusCode: 200, body: trackInArtistAlbums };
//           }
//         }
//         // then the track might not be owned by the artist
//         message = `Track not found for ${individualArtist}`;
//       }
//     }

//     const albums = await searchAlbum(token, albumName, artistName, year);
//     if (albums.length) {
//       for (const album of albums) {
//         const trackInAlbum = await findTrackInAlbum(token, album, trackName, album);
//         if (trackInAlbum) {
//           return { statusCode: 200, body: trackInAlbum };
//         }
//       }
//     }
//     return { statusCode: 404, body: "Track not found." };
//   } catch (error) {
//     handleError(error, "searching");
//     return { statusCode: error.response?.status || 500, body: error.message };
//   }
// };

// const searchAlbum = async (token, albumName, artistName, year) => {
//   const response = await search(token, `album:${albumName}`, "album", 50);
//   const albums = []
//   for (const album of response.albums.items) {
//     const release_year = album.release_date.split("-")[0];
//     const includesArtist = album.artists.some((artist) => artist.name.toLowerCase() === artistName.toLowerCase());
//     if (album.name.toLowerCase() === albumName.toLowerCase() && (release_year === year || includesArtist)) {
//       console.log('album found: ', album.name);
//       album.release_year = release_year;
//       albums.push(album);
//     }
//   }
//   return albums;
// };

// const findTrackInAlbum = async (token, album, trackName) => {
//   const albumTracksResponse = await http.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
//     headers: buildHeaders(token),
//   });
//   const track = await findTrack(albumTracksResponse.data.items, trackName, token);
//   if (track) return track;
//   return null;
// };

// const findTrackInArtistAlbums = async (token, artistData, trackName, year) => {
//   if (artistData.artists?.items) {
//     for (const artist of artistData.artists.items) {
//       const artistId = artist.id;
//       const artistAlbumsResponse = await http.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
//         headers: buildHeaders(token),
//       });
//       await sleep(2000);
//       for (const album of artistAlbumsResponse.data.items) {
//         if (album.release_date.split('-')[0] === year) {
//           const albumTracksResponse = await http.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
//             headers: buildHeaders(token),
//           });
//           await sleep(2000);
//           const track = await findTrack(albumTracksResponse.data.items, trackName, token);
//           if (track) return track;
//         }
//       }
//     }
//   }
//   return null;
// };

// const findTrack = async (tracks, fullTrackName, token) => {
//   let normalizedTrackNames = [fullTrackName]
//   if (fullTrackName.split('-').length) {
//     normalizedTrackNames = [];
//     for (const word of fullTrackName.split('-')) {
//       normalizedTrackNames.push(word);
//     }
//   }
//   let results = [];
//   let fuse = null;
//   for (const normalizedTrackName of normalizedTrackNames) {
//     fuse = new Fuse(tracks, {
//       keys: ["name"],
//       includeScore: true,
//       threshold: 0.3,
//     });
//     for (const track of tracks) {
//       console.log(`searching for ${normalizedTrackName} in ${track.name}`);
//     }
//     results = fuse.search(normalizedTrackName);
//     if (results.length > 0) {
//       const bestMatch = results[0].item;
//       const trackWithPopularity = await getTrackWithPopularity(token, bestMatch.id);
//       trackWithPopularity.preview_url = bestMatch.preview_url;
//       return trackWithPopularity;
//     }
//   }
// }

// const getTrackWithPopularity = async (token, trackId) => {
//   try {
//     const response = await http.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
//       headers: buildHeaders(token),
//     });
//     return response.data;
//   } catch (error) {
//     handleError(error, "getTrackWithPopularity");
//     return error;
//   }
// };

// const search = async (token, query, type, limit) => {
//   const response = await http.get("https://api.spotify.com/v1/search", {
//     headers: buildHeaders(token),
//     params: { q: query, type: type, limit, offset: 0 },
//   });
//   return response.data;
// };

// const splitArtists = (artistName) => {
//   if (artistName.includes("feat")) {
//     return artistName.split(" feat")[0];
//   }
//   if (artistName.includes("ft")) {
//     return artistName.split(" ft")[0];
//   }
//   if (artistName.includes("&")) {
//     return artistName.split(" & ");
//   }
//   return [artistName];
// };

// const isVariousArtist = (artistName) => {
//   const lowerCaseArtistName = artistName.toLowerCase();
//   return ['various artists', 'v/a', 'va'].includes(lowerCaseArtistName) || / [&+]/.test(artistName);
// };

// export { app };