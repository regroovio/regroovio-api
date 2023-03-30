import axios from 'axios';
import serverless from 'serverless-http';
import express from 'express';
import queryString from 'query-string';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/add-tracks-to-playlist', async (req, res) => {
  try {
    // const { token, trackIds, playlist } = req.body;

    // let existingTracksIds = await getAllPlaylistTracks(token, playlist);
    // const newTracksUris = trackIds.filter((id) => !existingTracksIds.includes(id));

    // if (newTracksUris.length) {
    //   let index = 0;
    //   while (index < newTracksUris.length) {
    //     const tracksToAdd = newTracksUris.slice(index, index + 100);
    //     await addTracksToPlaylist(token, playlist, tracksToAdd);
    //     index += 100;
    //   }
    //   res.send({ statusCode: 200, body: 'Tracks added to playlist' });
    // } else {
    // res.send({ statusCode: 200, body: 'Tracks already exist' });
    // }

    res.send({ statusCode: 200, body: 'adding tracks to playlist' });

  } catch (err) {
    console.log('Error adding tracks to playlist:');
    console.log(err);
    res.send(err);
  }
});

app.get('/get-audio-features', async (req, res) => {
  try {
    // const { id, token, min_energy, min_popularity } = req.body;

    // const audioFeatures = await getAudioFeaturesForTracks(token, [id]);
    // const trackRecommendations = await getRecommendations(token, { min_energy: +min_energy, seed_tracks: [id], min_popularity: +min_popularity });

    // res.send({ statusCode: 200, audioFeatures, trackRecommendations });

    res.send({ statusCode: 200, body: 'getting audio features' });

  } catch (err) {
    console.log('Error getting audio features:');
    console.log(err);
    res.send(err);
  }
});

app.get('/get-playlist', async (req, res) => {
  try {
    // const { token, playlistName } = req.body;
    // const playlistNameUpper = `${playlistName} ${new Date().getFullYear()}`.toUpperCase();

    // const userData = await getUserData(token);
    // const { id: user_id } = userData;
    // const playlist = await checkOutPlaylist(user_id, playlistNameUpper, token);

    // res.send({ statusCode: 200, body: playlist });

    res.send({ statusCode: 200, body: 'getting playlist' });

  } catch (err) {
    console.log('Error getting playlist:');
    console.log(err);
    res.send(err);
  }
});

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

const getAllPlaylistTracks = async (token, playlist) => {
  let offset = 0;
  let limit = 100;
  let playlistData = await getPlaylistTracks(token, playlist, offset, limit);
  let existingTracksIds = playlistData.items.map((track) => track.track.uri);

  while (playlistData.next) {
    offset += limit;
    playlistData = await getPlaylistTracks(token, playlist, offset, limit);
    existingTracksIds = existingTracksIds.concat(playlistData.items.map((track) => track.track.uri));
  }

  return existingTracksIds;
};

const getPlaylistTracks = async (token, playlist, offset, limit) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlist}/tracks?offset=${offset}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;

  } catch (error) {
    throw new Error(`Failed to fetch playlist tracks: ${error.response.statusText}`);
  }
};

const addTracksToPlaylist = async (token, playlist, tracksToAdd) => {
  try {
    const response = await axios.post(`https://api.spotify.com/v1/playlists/${playlist}/tracks`, {
      uris: tracksToAdd,
      position: 0,
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to add tracks to playlist: ${error.response.statusText}`);
  }
};

export const handler = serverless(app);