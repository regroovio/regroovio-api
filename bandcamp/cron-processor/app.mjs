// app.mjs

import axios from 'axios';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { getUserById } from './common/getUserById.mjs';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { AWS_DYNAMO } from "./common/config.mjs";

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));

const app = async (event, context) => {
    try {
        const { tableName, album } = event

        const admin_id = process.env.ADMIN_ID;
        let admin = await getUserById(admin_id);

        if (!admin) {
            console.error('User not found');
            return;
        }

        let token = admin.spotify_access_token || null;
        const remainingTimeInMinutes = (admin.spotify_expiration_timestamp - Date.now()) / 1000 / 60;
        console.log("Remaining time in minutes:", remainingTimeInMinutes.toFixed(0));

        if (remainingTimeInMinutes <= 20) {
            console.log('Token is expiring soon or already expired, refreshing...');
            const rawTokens = await invokeLambda({
                FunctionName: `spotify-token-${process.env.STAGE}`,
                Payload: JSON.stringify({ user_id: admin_id })
            });
            const tokens = JSON.parse(rawTokens);
            await updateUserTokens(admin, tokens);
            token = tokens.access_token;
        }

        const tracks = [];
        for (const track of album.tracks) {
            try {
                tracks.push(track);
                // const trackInfo = await getTrackInfo(track.url);
                // const trackResult = trackInfo.result
                // let genres = [];
                // if (trackResult?.apple_music) {
                //     genres = trackInfo.result.apple_music.genreNames
                // }
                // if (trackResult?.spotify) {
                //     const trackInfo = trackInfo.result.spotify;
                //     const trackWithFeatures = await enrichTrackWithFeatures(trackInfo, token);
                //     enrichTrackInfo(trackWithFeatures, trackInfo, genres);
                //     console.log(trackWithFeatures);
                //     tracks.push(trackWithFeatures);
                // }
                // console.log('No track info found for', track.url);
                // console.log('Track result:', trackResult);
            } catch (err) {
                console.error("Error updateTrackInfo:", err);
            }
        }

        // await saveTracksWithFeatures(admin, tracks);
        // return { message: 'Done.', tracksWithFeatures: tracks };

        return { message: 'Done.', tracks: tracks };
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

const saveTracksWithFeatures = async (admin, tracksWithFeatures) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB({
            region: process.env.REGION,
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_ACCESS_KEY
        }));
        admin.liked_tracks = tracksWithFeatures;
        await documentClient.put({ TableName: "users", Item: admin });
    } catch (err) {
        console.error(`Error saveTracksWithFeatures: ${err}`);
        throw err;
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

const updateUserTokens = async (admin, tokens) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        admin.spotify_access_token = tokens.access_token;
        admin.spotify_expiration_timestamp = tokens.expiration_timestamp;
        if (tokens?.refresh_token) {
            admin.refresh_token_spotify = tokens.refresh_token;
        }
        await documentClient.put({ TableName: "users", Item: admin });
    } catch (err) {
        console.error(`Error updateUserTokens: ${err}`);
        throw err;
    }
};

// const addAlbumToDb = async (table, album) => {
//     try {
//         await documentClient
//             .put({
//                 TableName: table,
//                 Item: album,
//             });
//     } catch (err) {
//         console.log(err);
//     }
// };

export { app }