// spotify.js

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
const client = new LambdaClient({ region: 'us-east-1' });

const runApp = async () => {
    const token = await getToken({
        FunctionName: 'spotify-token-dev',
        Payload: JSON.stringify({
            user_id: 'X9gHk7zL'
        })
    });

    console.log(token);

    const playlist = await getPlaylist({
        FunctionName: 'spotify-tracks-dev',
        Payload: JSON.stringify({
            method: token,
            token: token,
            playlistName: 'likes'
        })
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