// app.mjs

import axios from 'axios';
import { slackBot } from './common/slackBot.mjs';

class CustomError extends Error {
    constructor(message, functionName, additionalInfo) {
        super(message);
        this.functionName = functionName;
        this.additionalInfo = additionalInfo;
    }
}

const app = async (event, context) => {
    try {
        const { track, token } = event;
        console.log(event);
        if (!track || !track.name || !track.url) {
            throw new CustomError('Invalid track data', 'app');
        }

        console.log('Getting track info', track.name);
        const trackInfo = await getTrackInfo(track.url);

        if (!trackInfo) {
            throw new CustomError('Failed to get track info', 'app');
        }

        const trackResult = trackInfo.data.result;

        if (trackResult?.spotify) {
            const trackSpotify = trackResult.spotify;
            console.log('Track found', trackSpotify.name);
            track.spotify = trackSpotify;
        } else {
            console.log('No track info found for', track.name);
            track.spotify = null;
            await slackBot(new CustomError(
                `No track info found for ${track.name}`,
                'app',
                trackInfo.data || trackInfo.status
            ));

        }
        return { body: track.spotify };
    } catch (err) {
        console.error('Error:', err.message);
        await slackBot(err);
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
        });
        return response;
    } catch (error) {
        console.error(error);
        throw new CustomError(error.message, 'getTrackInfo');
    }
};

export { app };
