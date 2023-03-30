// spotify.js

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getUserById } from "./common/getUserById.mjs";
const client = new LambdaClient({ region: 'us-east-1' });

const runApp = async () => {
    const user_id = process.env.ADMIN_ID;
    const user = await getUserById(user_id);
    let token = user.spotify_access_token
    const remainingTime = user.spotify_expiration_timestamp - new Date().getTime();
    const isTokenExpiringSoon = remainingTime <= 30 * 60 * 1000;
    if (isTokenExpiringSoon) {
        token = await getToken({
            FunctionName: 'spotify-token-dev',
            Payload: JSON.stringify({ user_id })
        });
    }
    console.log(token);
    const playlist = await getPlaylist({
        FunctionName: 'spotify-get-playlist-dev',
        Payload: JSON.stringify({ token, playlistName: 'likes' })
    });

    console.log(playlist);
}


const getToken = async (params) => {
    try {
        const command = new InvokeCommand(params);
        const data = await client.send(command);
        const rawPayload = new TextDecoder().decode(data.Payload);
        const cleanedPayload = JSON.parse(rawPayload.replace(/^"|"$/g, ''));
        return cleanedPayload.body;
    } catch (error) {
        console.error('Error invoking Lambda function:', error);
    }
}

const getPlaylist = async (params) => {
    try {
        const command = new InvokeCommand(params);
        const data = await client.send(command);
        const rawPayload = new TextDecoder().decode(data.Payload);
        const cleanedPayload = JSON.parse(rawPayload.replace(/^"|"$/g, ''));
        return cleanedPayload.body;
    } catch (error) {
        console.error('Error invoking Lambda function:', error);
    }
}


runApp()