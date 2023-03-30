const runApp = async (event) => {
  try {
    const { id, token } = event
    console.log(id, token);
    return { statusCode: 200, body: 'getting audio features' }

    // const audioFeatures = await getAudioFeaturesForTracks(token, [id]);
    // const trackRecommendations = await getRecommendations(token, { min_energy: +min_energy, seed_tracks: [id], min_popularity: +min_popularity });
    // return { statusCode: 200, audioFeatures, trackRecommendations }
  } catch (err) {
    console.log('Error getting audio features:');
    console.log(err);
  }
}

const getAudioFeaturesForTracks = async (token, ids) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/audio-features?ids=${ids.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch audio features: ${error.response.statusText}`);
  }
};

const getRecommendations = async (token, options) => {
  const queryParams = queryString.stringify(options);
  try {
    const response = await axios.get(`https://api.spotify.com/v1/recommendations?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch recommendations: ${error.response.statusText}`);
  }
};

export { runApp };
