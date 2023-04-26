import axios from "axios";

const app = async (event) => {
  try {
    const { user, track } = event.queryStringParameters;
    console.log(user, track);

    return { statusCode: 200, body: 'adding track to playlist' }

  } catch (err) {
    console.log('Error adding track to playlist:');
    console.log(err);
  }
}

export { app };
