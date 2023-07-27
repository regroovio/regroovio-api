// app.mjs

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getUserById } from "./common/getUserById.mjs";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const lambdaClient = new LambdaClient({ region: process.env.REGION });
const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const app = async () => {
    const user_id = process.env.ADMIN_ID;
    let user = await getUserById(user_id);

    if (!user) {
        throw new Error(`User not found with id ${user_id}`);
    }

    let token = user.access_token_spotify || null;
    const remainingTimeInMinutes = (user.expiration_timestamp_spotify - Date.now()) / 1000 / 60;
    console.log(`Token expires in: ${remainingTimeInMinutes.toFixed(0)} minutes`);

    if (remainingTimeInMinutes <= 15 || !remainingTimeInMinutes) {
        console.log('Token is expiring soon or already expired, refreshing...');
        const rawTokens = await invokeLambda({
            FunctionName: `spotify-scrap-token-${process.env.STAGE}`,
            Payload: JSON.stringify({ user_id: user_id })
        });
        const tokens = JSON.parse(rawTokens);
        await updateUserTokens(user, tokens);
        token = tokens.access_token;
    }


    console.log('getting liked tracks');

    let tracks = await fetchTracks(token);

    if (!tracks?.length) {
        return { message: 'No liked tracks found.' };
    }

    console.log(`Found ${tracks.length} tracks.`);
    const tracksWithFeatures = []

    for (const track of tracks) {
        const trackWithFeatures = await enrichTracksWithFeatures(track, token);
        tracksWithFeatures.push({ ...trackWithFeatures, ...track });
    }

    await saveTracksWithFeatures(user, tracksWithFeatures);
    return { message: 'All tracks are saved.' };
};

const invokeLambda = async (params) => {
    try {
        const command = new InvokeCommand(params);
        const data = await lambdaClient.send(command);
        const rawPayload = new TextDecoder().decode(data.Payload);
        const cleanedPayload = JSON.parse(rawPayload.replace(/^"|"$/g, ''));
        return cleanedPayload.body;
    } catch (error) {
        console.log('Error invoking Lambda function:', error);
    }
};

const fetchTracks = async (token) => {
    const rawTopTracks = await invokeLambda({
        FunctionName: `spotify-get-top-${process.env.STAGE}`,
        Payload: JSON.stringify({ token, type: 'tracks', time_range: 'medium_term', limit: 50, offset: 0 })
    });
    const topTracks = JSON.parse(rawTopTracks).body;
    return topTracks
};

const enrichTracksWithFeatures = async (track, token) => {
    const result = await invokeLambda({
        FunctionName: `spotify-get-audio-features-${process.env.STAGE}`,
        Payload: JSON.stringify({ token, id: track.id })
    })
    const trackFeatures = JSON.parse(result).body;
    return trackFeatures;
};


const saveTracksWithFeatures = async (user, tracksWithFeatures) => {
    try {
        user.liked_tracks = tracksWithFeatures;
        await documentClient.put({ TableName: `regroovio-users-${process.env.STAGE}`, Item: user });
    } catch (err) {
        console.log(`Error saveTracksWithFeatures: ${err}`);
        throw err;
    }
};

const updateUserTokens = async (user, tokens) => {
    try {
        user.access_token_spotify = tokens.access_token;
        user.expiration_timestamp_spotify = tokens.expiration_timestamp;
        if (tokens?.refresh_token) {
            user.refresh_token_spotify = tokens.refresh_token;
        }
        await documentClient.put({ TableName: `regroovio-users-${process.env.STAGE}`, Item: user });
    } catch (err) {
        console.log(`Error updateUserTokens: ${err}`);
        throw err;
    }
};

export { app };