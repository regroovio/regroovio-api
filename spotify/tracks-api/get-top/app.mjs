import axios from "axios";

const runApp = async (event) => {
  try {
    const { token, type, time_range, limit, offset } = event;
    console.log({ token, type, time_range, limit, offset });
    const userData = await getUserTop(token, type, time_range, limit, offset);

    return { statusCode: 200, body: userData };
  } catch (err) {
    console.log("Error getting user's top items:");
    console.log(err);
  }
};

const getUserTop = async (token, type, time_range, limit, offset) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=${limit}&offset=${offset}`, {
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
