import axios from "axios";

const app = async (event) => {
  try {
    const { token, playlist, tracks } = event
    console.log(token, playlist, tracks);
    return { statusCode: 200, body: 'adding tracks to playlist' }


    // let existingTracksIds = await getAllPlaylistTracks(token, playlist);
    // const newTracksUris = trackIds.filter((id) => !existingTracksIds.includes(id));
    // if (newTracksUris.length) {
    //   let index = 0;
    //   while (index < newTracksUris.length) {
    //     const tracksToAdd = newTracksUris.slice(index, index + 100);
    //     await addTracksToPlaylist(token, playlist, tracksToAdd);
    //     index += 100;
    //   }
    //   return { statusCode: 200, body: 'Tracks added to playlist' }
    // } else {
    //   return { statusCode: 200, body: 'Tracks already exist' }
    // }
  } catch (err) {
    console.log('Error adding tracks to playlist:');
    console.log(err);
  }
}

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

export { app };
