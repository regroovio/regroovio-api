import axios from "axios";
import jaroWinkler from "jaro-winkler";

const app = async (event) => {
  try {
    const { token, trackName, year, albumName, artistName } = event;
    console.log(event);
    const isVA = isVariousArtist(artistName);
    const individualArtists = splitArtists(artistName);
    let track = null;
    for (const individualArtist of individualArtists) {
      if (isVA) {
        const albumData = await search(token, year, albumName, individualArtist);
        const trackInAlbum = await findTrackInAlbum(token, albumData, trackName, isVA);
        if (trackInAlbum) {
          track = trackInAlbum;
          break;
        }
      }
      const artistData = await findArtist(token, individualArtist);
      const trackInArtistAlbums = await findTrackInArtistAlbums(token, artistData, trackName, albumName);
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

const findTrackInArtistAlbums = async (token, artistData, trackName, albumName) => {
  if (artistData.artists?.items) {
    for (const artist of artistData.artists.items) {
      const artistId = artist.id;
      const artistAlbumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
        headers: buildHeaders(token),
      });

      for (const album of artistAlbumsResponse.data.items) {
        const albumNameSimilarity = compareStrings(album.name, albumName);
        const albumNameIncludes = album.name.toLowerCase().includes(albumName.toLowerCase());
        if (albumNameSimilarity >= 0.8 || albumNameIncludes) {
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

const search = async (token, year, albumName, artistName) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: buildHeaders(token),
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
      return (albumYear === year || albumNameSimilarity >= 0.8 || albumNameIncludes) && artistNameSimilarity >= 0.8;
    });
    return filteredAlbums;
  } catch (error) {
    handleError(error, "search");
    return error;
  }
};

const findTrackInAlbum = async (token, albumData, trackName) => {
  for (const album of albumData) {
    const albumTracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
      headers: buildHeaders(token),
    });
    const track = findTrack(albumTracksResponse.data.items, trackName);
    if (track) return track;
  }
  return null;
};

const findTrack = (tracks, fullTrackName) => {
  let trackNameToFind = fullTrackName;
  if (isVariousArtist) {
    const splitTrackName = fullTrackName.split(" - ");
    trackNameToFind = splitTrackName.length > 1 ? splitTrackName[1] : splitTrackName[0];
  }
  for (const track of tracks) {
    console.log(`comparing track: '${track.name}' with '${trackNameToFind}'`);
    const trackNameSimilarity = compareStrings(track.name, trackNameToFind);
    if (trackNameSimilarity >= 0.8) {
      return track;
    }
  }
  return null;
};

const compareStrings = (str1, str2) => {
  return jaroWinkler(str1, str2, { caseSensitive: false });
};

const buildHeaders = (token) => {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export { app };