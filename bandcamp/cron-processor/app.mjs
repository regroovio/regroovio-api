// app.mjs

import axios from 'axios';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { AWS_DYNAMO } from "./common/config.mjs";

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));

const app = async (event, context) => {
    try {
        const { tableName, album, token } = event
        for (const track of album.tracks) {
            try {
                const trackInfo = await getTrackInfo(track.url);
                const trackResult = trackInfo.result
                let genres = [];
                if (trackResult?.apple_music) {
                    genres = trackInfo.result.apple_music.genreNames
                }
                if (trackResult?.spotify) {
                    const trackResultSpotify = trackResult.spotify;
                    const trackWithFeatures = await enrichTrackWithFeatures(trackInfo, token);
                    console.log('');
                    console.log("trackResultSpotify ", trackResultSpotify);
                    console.log("trackWithFeatures ", trackWithFeatures);
                    // enrichTrackInfo(trackWithFeatures, trackInfo, genres);
                    // console.log(trackWithFeatures);
                }
                console.log('No track info found for', track.url);
                console.log(trackResult);
            } catch (err) {
                console.error("Error updateTrackInfo:", err);
            }
        }

        return { message: 'Done.', tracksWithFeatures: tracks };
    } catch (err) {
        return { message: 'Failed', err };
    }
};

const enrichTrackInfo = (trackWithFeatures, track, genres) => {
    trackWithFeatures.popularity = track.popularity;
    trackWithFeatures.release_date = track.album.release_date;
    trackWithFeatures.album = track.album.name;
    trackWithFeatures.name = track.name;
    trackWithFeatures.genres = genres;
    delete trackWithFeatures.type;
    delete trackWithFeatures.track_href;
    delete trackWithFeatures.analysis_url;
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
        return response.data
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

export { app }