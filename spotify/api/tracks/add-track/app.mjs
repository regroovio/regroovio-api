import axios from "axios";

const saveTrackToUserLibrary = async (accessToken, trackIds) => {
  try {
    const response = await axios.put(
      "https://api.spotify.com/v1/me/tracks",
      { ids: trackIds },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 200) {
      console.log("Track(s) added to the user's library successfully.");
    } else {
      console.log("Error adding track(s) to the user's library:", response.status);
    }
  } catch (error) {
    console.error("Error adding track(s) to the user's library:", error.message);
  }
};

const app = async (event) => {
  try {
    const { user, track } = event.queryStringParameters;
    console.log(event.queryStringParameters);

    // await saveTrackToUserLibrary(accessToken, [track]);

    return { statusCode: 200, body: "Adding track to playlist" };
  } catch (err) {
    console.log("Error adding track to playlist:");
    console.log(err);
  }
};

export { app };
