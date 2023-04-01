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
        for (const track of album.tracks) {
            try {
                const trackInfo = await getTrackInfo(track.url);
                const trackResult = trackInfo.data.result
                let key_words = [];
                if (trackResult?.apple_music) {
                    key_words = trackResult.apple_music.genreNames
                }
                if (trackResult?.spotify) {
                    const trackSpotify = trackResult.spotify;
                    console.log('Track found', trackSpotify.name);
                    const trackWithFeatures = await enrichTrackWithFeatures(trackSpotify, token);
                    enrichTrackInfo(trackWithFeatures, trackSpotify, [...key_words, ...album.key_words])
                    console.log("trackWithFeatures", trackWithFeatures);
                    track.spotify = trackWithFeatures
                } else {
                    console.log('No track info found for', track.name);
                    track.spotify = trackInfo.data || trackInfo.status
                }
            } catch (err) {
                console.error("Error updateTrackInfo:", err);
            }
        }
        await saveTracksWithFeatures(tableName, album)

        return { message: 'Done.' };
    } catch (err) {
        return { message: 'Failed', err };
    }
};

const enrichTrackInfo = (trackWithFeatures, track, key_words) => {
    if (trackWithFeatures) {
        trackWithFeatures.popularity = track.popularity;
        trackWithFeatures.release_date = track.album.release_date;
        trackWithFeatures.artists = track.album.artists;
        trackWithFeatures.album = track.album.name;
        trackWithFeatures.name = track.name;
        trackWithFeatures.key_words = key_words;
        delete trackWithFeatures.type;
        delete trackWithFeatures.track_href;
        delete trackWithFeatures.analysis_url;
    } else {
        console.error("trackWithFeatures is undefined");
    }
};

const enrichTrackWithFeatures = async (track, token) => {
    const trackWithFeatures = JSON.parse(await invokeLambda({
        FunctionName: `spotify-get-audio-features-${process.env.STAGE}`,
        Payload: JSON.stringify({ token, id: track.id })
    })).body;
    return trackWithFeatures;
};

const getTrackInfo = async (url) => {
    try {
        const response = await axios.post('https://api.audd.io/', {
            url: url,
            return: 'apple_music,spotify',
            api_token: process.env.AUDD_API_KEY,
        },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
        return response
    } catch (error) {
        console.error(error);
        return error
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
        album.processed = true
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        await documentClient.put({ TableName: tableName, Item: album });
    } catch (err) {
        console.error(`Error saveTracksWithFeatures: ${err}`);
        throw err;
    }
};

export { app }