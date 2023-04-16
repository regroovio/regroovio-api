import axios from "axios";

const app = async (event) => {
  try {
    const { token, trackName, year, albumName } = event;
    const searchData = await search(token, year, albumName);
    if (searchData.albums && searchData.albums.items) {
      for (const album of searchData.albums.items) {
        const track = await findTrackInAlbum(token, album.id, trackName);
        if (track) {
          return { statusCode: 200, body: track };
        }
      }
    }
    return { statusCode: 404, body: 'Track not found.' };
  } catch (err) {
    console.log("Error searching:");
    console.log(err);
  }
};

const search = async (token, year, albumName) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: `album:${albumName} year:${year}`,
        type: 'album',
      },
    });
    return response.data;
  } catch (error) {
    return error;
  }
};

const findTrackInAlbum = async (token, albumId, trackName) => {
  console.log(albumId);
  try {
    const response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const tracks = response.data.items;
    let track_found = null
    for (const track of tracks) {
      let target = trackName.toLowerCase()
      let source = track.name.toLowerCase()
      if (source.includes(target) || target.includes(source)) {
        track_found = track;
        break;
      }
    }
    return track_found;
  } catch (error) {
    console.error("Error finding track in album:", error);
    return null;
  }
};

export { app };
