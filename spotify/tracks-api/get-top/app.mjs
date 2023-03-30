import axios from "axios";

const runApp = async (event) => {
  try {
    const { token, playlistName } = event;
    console.log(token, playlistName);
    const userData = await getUserLikes(token);

    return { statusCode: 200, body: userData };
  } catch (err) {
    console.log("Error getting playlist:");
    console.log(err);
  }
};


const getUserLikes = async (token) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // get the users liked songs and return them
    console.log("response: ", response.data);
    return response.data;
  } catch (error) {
    return error.data;
  }
};

export { runApp };
