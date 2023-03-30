import axios from "axios";

const runApp = async (event) => {
  try {
    const { token, playlistName } = event
    console.log(token, playlistName);
    const userData = await getUserData(token);
    console.log(userData);
    return { statusCode: 200, body: userData }
  } catch (err) {
    console.log('Error getting playlist:');
    console.log(err);
  }
}

const getUserData = async (token) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.log(error.data);
    return error.data
  }
};

export { runApp };

