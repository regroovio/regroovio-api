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
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch user data: ${error}`);
  }
};

export { runApp };

