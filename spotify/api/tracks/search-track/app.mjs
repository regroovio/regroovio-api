import axios from "axios";

const app = async (event) => {
  try {
    const { token, trackName, year, albumName, artistName } = event;
    console.log(event);

    const searchData = await search(token, year, albumName);
    if (searchData.albums?.items) {
      for (const album of searchData.albums.items) {
        const track = await findTrackInAlbum(token, album.id, trackName, artistName, albumName);
        if (track) {
          return { statusCode: 200, body: track };
        }
      }
    }
    return { statusCode: 404, body: 'Track not found.' };
  } catch (err) {
    console.error("Error searching:", err);
  }
};

const search = async (token, year, albumName) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: buildHeaders(token),
      params: {
        q: `album:${albumName} year:${year}`,
        type: 'album',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error in search function:", error);
    return error;
  }
};

const findTrackInAlbum = async (token, albumId, trackName, artistName, albumName) => {
  try {
    const tracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
      headers: buildHeaders(token),
    });

    const tracks = tracksResponse.data.items;
    let foundTrack = findTrack(tracks, trackName);

    if (!foundTrack) {
      for (const track of tracks) {
        const artistId = track.artists[0].id;
        const artistAlbumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
          headers: buildHeaders(token),
        });

        for (const album of artistAlbumsResponse.data.items) {
          if (compareStrings(album.name, artistName) >= 80) {
            const albumTracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
              headers: buildHeaders(token),
            });
            foundTrack = findTrack(albumTracksResponse.data.items, trackName);
            if (foundTrack) break;
          }
        }
        if (foundTrack) break;
      }
    }
    return foundTrack;
  } catch (error) {
    console.error("Error finding track in album:", error);
    return null;
  }
};

const buildHeaders = (token) => {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const findTrack = (tracks, trackName) => {
  for (const track of tracks) {
    if (compareStrings(track.name, trackName) >= 80) {
      console.log('Found track');
      return track;
    }
  }
  return null;
};

const compareStrings = (str1, str2) => {
  const cleanedStr1 = cleanString(str1);
  const cleanedStr2 = cleanString(str2);
  const words1 = cleanedStr1.split(" ");
  const words2 = cleanedStr2.split(" ");
  let matches = 0;

  for (const word of words1) {
    if (word === words2[0]) {
      return 100;
    }
    if (words2.includes(word)) {
      matches++;
    }
  }
  return (matches / words1.length) * 100;
};

const cleanString = (str) => {
  return str.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase();
};

export { app };
