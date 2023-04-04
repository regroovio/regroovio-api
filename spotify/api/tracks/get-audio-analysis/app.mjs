import axios from "axios";

const app = async (event) => {
  try {
    const { token, id } = event;
    console.log({ token, id });
    const audioFeatures = await getAudioAnalysis(token, id);

    return { statusCode: 200, body: audioFeatures };
  } catch (err) {
    console.log("Error getting track's audio features:");
    console.log(err);
  }
};

const getAudioAnalysis = async (token, id) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/`, {
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

export { app };