// app.mjs

import axios from 'axios';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const app = async (event, context) => {
    try {
        const { track, token } = event;
        console.log(event);
        if (!track || !track.name || !track.url) {
            throw new Error('Invalid track data');
        }

        console.log('Getting track info', track.name);
        const trackInfo = await getTrackInfo(track.url);

        if (!trackInfo) {
            throw new Error('Failed to get track info');
        }

        const trackResult = trackInfo.data.result;

        if (trackResult?.spotify) {
            const trackSpotify = trackResult.spotify;
            console.log('Track found', trackSpotify.name);
            const trackFeatures = await getTrackFeatures(trackSpotify, token);
            track.spotify = {
                ...trackFeatures,
                ...trackSpotify
            };
        } else {
            console.log('No track info found for', track.name);
            track.spotify = trackInfo.data || trackInfo.status;
        }
        return { body: track.spotify };
    } catch (err) {
        console.error('Error:', err.message);
        return { message: 'Failed', err };
    }
};

const getTrackFeatures = async (track, token) => {
    if (!track || !track.id || !token) {
        console.error("getTrackFeatures: Invalid parameters");
        return null;
    }

    const payload = JSON.stringify({ token, id: track.id });
    const rawResult = await invokeLambda({
        FunctionName: `spotify-get-audio-features-${process.env.STAGE}`,
        Payload: payload,
    });

    if (rawResult && rawResult.body) {
        const trackFeatures = JSON.parse(rawResult.body);
        return trackFeatures;
    } else {
        console.error("getTrackFeatures: Received undefined body in the response");
        return null;
    }
};

const getTrackInfo = async (track) => {
    if (!track || !process.env.AUDD_API_KEY) {
        console.error("getTrackInfo: Invalid parameters");
        return null;
    }

    try {
        console.log('fetching from audd.io: ', track);
        const response = await axios.post('https://api.audd.io/', {
            url: track,
            return: 'apple_music,spotify',
            api_token: process.env.AUDD_API_KEY,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return response;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const invokeLambda = async (params) => {
    try {
        const command = new InvokeCommand(params);
        const data = await lambdaClient.send(command);
        const rawPayload = new TextDecoder().decode(data.Payload);
        const cleanedPayload = JSON.parse(rawPayload.replace(/^"|"$/g, ''));
        return cleanedPayload.body;
    } catch (error) {
        console.error('Error invoking Lambda function:', error);
        return null;
    }
};

export { app };