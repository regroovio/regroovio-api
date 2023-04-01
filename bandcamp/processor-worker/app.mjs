// app.mjs

import axios from 'axios';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { AWS_DYNAMO } from "./common/config.mjs";

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const app = async (event, context) => {
    try {
        const { tableName, album, token } = event
        console.log('Getting album info', album.album_id);

        await Promise.all(album.tracks.map(async (track) => {
            try {
                const trackInfo = await getTrackInfo(track.url);
                const trackResult = trackInfo.data.result;
                let key_words = [];

                if (trackResult?.apple_music) {
                    key_words = trackResult.apple_music.genreNames;
                }

                if (trackResult?.spotify) {
                    const trackSpotify = trackResult.spotify;
                    console.log('Track found', trackSpotify.name);

                    const trackFeatures = await getTrackFeatures(trackSpotify, token);
                    console.log("trackFeatures", trackFeatures);

                    track.spotify = {
                        ...trackFeatures,
                        popularity: trackSpotify.popularity,
                        release_date: trackSpotify.album.release_date,
                        artists: trackSpotify.album.artists,
                        album: trackSpotify.album.name,
                        name: trackSpotify.name,
                        key_words: [...key_words, ...album.key_words],
                    };

                    console.log("trackWithFeatures", track.spotify);
                } else {
                    console.log('No track info found for', track.name);
                    track.spotify = trackInfo.data || trackInfo.status;
                }
            } catch (err) {
                console.error("Error updateTrackInfo:", err);
            }
        }));

        await saveTracksWithFeatures(tableName, album);

        return { message: 'Done.' };
    } catch (err) {
        return { message: 'Failed', err };
    }
};

const getTrackFeatures = async (track, token) => {
    const payload = JSON.stringify({ token, id: track.id });
    const trackFeatures = JSON.parse(await invokeLambda({
        FunctionName: `spotify-get-audio-features-${process.env.STAGE}`,
        Payload: payload,
    })).body;

    return trackFeatures;
};

const getTrackInfo = async (url) => {
    try {
        const response = await axios.post('https://api.audd.io/', {
            url: url,
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
        return error;
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
    }
};

const saveTracksWithFeatures = async (tableName, album) => {
    try {
        album.processed = true;
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        await documentClient.put({ TableName: tableName, Item: album });
    } catch (err) {
        console.error(`Error saveTracksWithFeatures: ${err}`);
        throw err;
    }
};

export { app };
