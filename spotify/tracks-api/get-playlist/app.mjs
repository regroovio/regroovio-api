const runApp = async (event) => {
  try {
    const { token, playlistName } = event
    console.log(token, playlistName);
    return { statusCode: 200, body: 'getting playlist' }



    // const playlistNameUpper = `${playlistName} ${new Date().getFullYear()}`.toUpperCase();
    // const userData = await getUserData(token);
    // const { id: user_id } = userData;
    // const playlist = await checkOutPlaylist(user_id, playlistNameUpper, token);
    // return { statusCode: 200, body: playlist }
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
    throw new Error(`Failed to fetch user data: ${error.response.statusText}`);
  }
};

export { runApp };

