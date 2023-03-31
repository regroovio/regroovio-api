import axios from "axios";

const app = async (event) => {
  try {
    const { token, limit, offset } = event;
    console.log({ token, limit, offset });
    const userData = await getUserLikes(token, limit, offset);

    console.log("userData: ", userData);

    return { statusCode: 200, body: userData };
  } catch (err) {
    console.log("Error getting playlist:");
    console.log(err);
  }
};

const getUserLikes = async (token, limit, offset) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    return error.data;
  }
};

export { app };
