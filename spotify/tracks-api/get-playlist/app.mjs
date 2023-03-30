import axios from "axios";

const app = async (event) => {
  try {
    const { token, playlistName } = event;
    console.log(token, playlistName);
    const userData = await getUserData(token);

    const userPlaylists = await getUserPlaylists(token);
    console.log(userPlaylists);

    return { statusCode: 200, body: userData };
  } catch (err) {
    console.log("Error getting playlist:");
    console.log(err);
  }
};

const getUserData = async (token) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("response: ", response.data);
    return response.data;
  } catch (error) {
    return error.data;
  }
};

const getUserPlaylists = async (token, limit = 20, offset = 0) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/me/playlists", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      params: {
        limit,
        offset,
      },
    });
    console.log("response: ", response.data);
    return response.data;
  } catch (error) {
    return error.data;
  }
};

export { app };
