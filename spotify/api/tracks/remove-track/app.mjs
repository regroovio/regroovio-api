import axios from "axios";

const removeTrackFromUserLibrary = async (accessToken, trackIds) => {
  try {
    const response = await axios.delete(
      "https://api.spotify.com/v1/me/tracks",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: { ids: trackIds },
      }
    );

    if (response.status === 200) {
      console.log("Track(s) removed from the user's library successfully.");
    } else {
      console.log("Error removing track(s) from the user's library:", response.status);
    }
  } catch (error) {
    console.error("Error removing track(s) from the user's library:", error.message);
  }
};

const app = async (event) => {
  try {
    const { user, track } = event.queryStringParameters;
    console.log(event.queryStringParameters);

    // await removeTrackFromUserLibrary(accessToken, [track]);

    return { statusCode: 200, body: "Removing track from playlist" };
  } catch (err) {
    console.log("Error removing track from playlist:");
    console.log(err);
  }
};

export { app };
