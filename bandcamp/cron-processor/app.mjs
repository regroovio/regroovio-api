// app.mjs

import axios from 'axios';
import dotenv from 'dotenv';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { getUserById } from './common/getUserById.mjs';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
dotenv.config();

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const documentClient = DynamoDBDocument.from(new DynamoDB({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
}));

const app = async (event, context) => {
    try {
        const userId = process.env.ADMIN_ID;
        let user = await getUserById(userId);

        if (!user) {
            console.error('User not found');
            return;
        }

        let token = user.spotify_access_token || null;
        await refreshTokenIfNecessary(user, token);

        const table = `bandcamp-${event.table}-${process.env.STAGE}`;
        let albums = await getTableItems(table);
        if (!albums?.length) {
            return { message: 'No albums found' };
        }

        const tracks = [];
        for (const album of albums) {
            for (const track of album.tracks) {
                try {
                    const updatedTrack = await getAlbumInfo(track);
                    const trackInfo = updatedTrack.result.spotify;
                    const trackWithFeatures = await enrichTrackWithFeatures(trackInfo, token);
                    enrichTrackInfo(trackWithFeatures, trackInfo, updatedTrack.result.apple_music.genreNames);
                    tracks.push(trackWithFeatures);
                } catch (err) {
                    console.error("Error updateTrackInfo:", err);
                }
            }
        }
        await saveTracksWithFeatures(user, tracks);
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

const saveTracksWithFeatures = async (user, tracksWithFeatures) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB({
            region: process.env.REGION,
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_ACCESS_KEY
        }));
        user.liked_tracks = tracksWithFeatures;
        await documentClient.put({ TableName: "users", Item: user });
    } catch (err) {
        console.error(`Error saveTracksWithFeatures: ${err}`);
        throw err;
    }
};

const refreshTokenIfNecessary = async (user, token) => {
    if (token) {
        const remainingTimeInMinutes = (user.spotify_expiration_timestamp - Date.now()) / 1000 / 60;
        console.log("Remaining time in minutes:", remainingTimeInMinutes.toFixed(0));
        if (remainingTimeInMinutes <= 20) {
            console.log('Token is expiring soon or already expired, refreshing...');
            const tokens = JSON.parse(await invokeLambda({
                FunctionName: 'spotify-token-dev',
                Payload: JSON.stringify({ user_id: user.id })
            }));
            await updateUserTokens(user, tokens);
            token = tokens.access_token;
        }
    }
};

const enrichTrackWithFeatures = async (track, token) => {
    const trackWithFeatures = JSON.parse(await invokeLambda({
        FunctionName: 'spotify-get-audio-features-dev',
        Payload: JSON.stringify({ token, id: track.id })
    })).body;
    return trackWithFeatures;
};

const getTableItems = async (tableName) => {
    try {
        const params = { TableName: tableName, Limit: 100 };
        let result;
        const items = [];
        do {
            result = await documentClient.scan(params);
            items.push(...result.Items);
            params.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (result.LastEvaluatedKey);
        return items;
    } catch (err) {
        console.error(`Error fetching items: ${err}`);
        return [];
    }
};


const getAlbumInfo = async (url) => {
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

const addAlbumToDb = async (table, album) => {
    try {
        await documentClient
            .put({
                TableName: table,
                Item: album,
            });
    } catch (err) {
        console.log(err);
    }
};

export { app }