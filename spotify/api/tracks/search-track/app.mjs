import axios from "axios";

const app = async (event) => {
  try {
    const { token, trackName, year, albumName, artistName } = event;
    console.log(event);

    const artistData = await findArtist(token, artistName);

    if (artistData.artists?.items) {
      for (const artist of artistData.artists.items) {
        const artistId = artist.id;
        const track = await findTrackInArtistAlbums(token, artistId, trackName, albumName);
        if (track) {
          return { statusCode: 200, body: track };
        }
      }
    }

    const albumData = await search(token, year, albumName);
    if (albumData.albums?.items) {
      for (const album of albumData.albums.items) {
        const track = await findTrackInAlbum(token, album.id, trackName, artistName);
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

const findArtist = async (token, artistName) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: buildHeaders(token),
      params: {
        q: artistName,
        type: 'artist',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error in findArtist function:", error);
    return error;
  }
};

const findTrackInArtistAlbums = async (token, artistId, trackName, albumName) => {
  try {
    const artistAlbumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: buildHeaders(token),
    });

    for (const album of artistAlbumsResponse.data.items) {
      if (compareStrings(album.name, albumName) >= 80) {
        const track = await findTrackInAlbum(token, album.id, trackName);
        if (track) return track;
      }
    }
    return null;
  } catch (error) {
    console.error("Error in findTrackInArtistAlbums function:", error);
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
