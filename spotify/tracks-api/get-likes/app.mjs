import axios from "axios";

const runApp = async (event) => {
  try {
    const { token, limit, offset } = event;
    console.log({ token, limit, offset });
    const userData = await getUserLikes(token, limit, offset);

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

    console.log("response: ", response.data);
    return response.data.items;
  } catch (error) {
    return error.data;
  }
};

export { runApp };
