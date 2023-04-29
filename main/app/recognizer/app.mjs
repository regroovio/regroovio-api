// app.mjs

import axios from 'axios';
import { slackBot } from './common/slackBot.mjs';

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
            const notification = {
                status: "FAILURE",
                functionName: `regroovio-recognizer-${process.env.STAGE}`,
                message: "trackInfo is null",
            };
            await slackBot(notification);
            throw new Error('Failed to get track info');
        }

        const trackResult = trackInfo.data.result;

        if (trackResult?.spotify) {
            const trackSpotify = trackResult.spotify;
            console.log('Track found', trackSpotify.name);
            track.spotify = trackSpotify;
        } else {
            console.log('No track info found for', track.name);
            const notification = {
                status: "FAILURE",
                functionName: `regroovio-recognizer-${process.env.STAGE}`,
                message: `No track info found for ${track.name}\n${trackInfo.data || trackInfo.status}`,
            };
            await slackBot(notification);
            track.spotify = trackInfo.data || trackInfo.status;
        }
        return { body: track.spotify };
    } catch (err) {
        console.error('Error:', err.message);
        return { message: 'Failed', err };
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
            timeout: 10000,
        });
        return response;
    } catch (error) {
        console.error(error);
        const notification = {
            status: "FAILURE",
            functionName: `regroovio-recognizer-${process.env.STAGE}`,
            message: error.message,
        };
        await slackBot(notification);
        return null;
    }
};

export { app };