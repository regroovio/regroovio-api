import axios from "axios";
import jaroWinkler from 'jaro-winkler';

const app = async (event) => {
  try {
    const { token, trackName, year, albumName, artistName } = event;
    console.log(event);

    const artistData = await findArtist(token, artistName);
    const track = await findTrackInArtistAlbums(token, artistData, trackName, albumName);

    if (track) {
      return { statusCode: 200, body: track };
    } else {
      const albumData = await search(token, year, albumName);
      const trackInAlbum = await findTrackInAlbum(token, albumData, trackName, artistName);

      if (trackInAlbum) {
        return { statusCode: 200, body: trackInAlbum };
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

const findTrackInArtistAlbums = async (token, artistData, trackName, albumName) => {
  if (artistData.artists?.items) {
    for (const artist of artistData.artists.items) {
      const artistId = artist.id;
      const artistAlbumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
        headers: buildHeaders(token),
      });

      for (const album of artistAlbumsResponse.data.items) {
        if (compareStrings(album.name, albumName) >= 80) {
          const albumTracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
            headers: buildHeaders(token),
          });
          const track = findTrack(albumTracksResponse.data.items, trackName);
          if (track) return track;
        }
      }
    }
  }
  return null;
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

const findTrackInAlbum = async (token, albumData, trackName, artistName) => {
  if (albumData.albums?.items) {
    for (const album of albumData.albums.items) {
      const albumTracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
        headers: buildHeaders(token),
      });
      const track = findTrack(albumTracksResponse.data.items, trackName);

      if (track) {
        const trackArtistName = track.artists[0]?.name;
        if (compareStrings(trackArtistName, artistName) >= 80) {
          return track;
        }
      }
    }
  }
  return null;
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
      return track;
    }
  }
  return null;
};

const compareStrings = (str1, str2) => {
  const cleanedStr1 = cleanString(str1);
  const cleanedStr2 = cleanString(str2);
  const similarity = jaroWinkler(cleanedStr1, cleanedStr2);
  return similarity * 100;
};

const cleanString = (str) => {
  return str.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase();
};

export { app };
