// spotify.js

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getUserById } from "./common/getUserById.mjs";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./common/config.mjs";

const client = new LambdaClient({ region: 'us-east-1' });

const runApp = async () => {
    const user_id = process.env.ADMIN_ID;
    let user = await getUserById(user_id);
    let token = user.spotify_access_token || null;

    if (token) {
        const remainingTimeInMinutes = (user.spotify_expiration_timestamp - Date.now()) / 1000 / 60;
        console.log("Remaining time in minutes:", remainingTimeInMinutes.toFixed(0));
        if (remainingTimeInMinutes <= 30) {
            console.log('Token is expiring soon or already expired, refreshing...');
            const tokens = JSON.parse(await getToken({
                FunctionName: 'spotify-token-dev',
                Payload: JSON.stringify({ user_id })
            }))
            await updateUserTokens(user, tokens);
            token = tokens.access_token;
        }
    }
    const tracksUris = [];

    const likedTracks = JSON.parse(await lambda({
        FunctionName: 'spotify-get-likes-dev',
        Payload: JSON.stringify({ token, limit: 50, offset: 0 })
    })).body
    for (const track of likedTracks) {
        tracksUris.push(track.track.uri);
    }
    const topTracks = JSON.parse(await lambda({
        FunctionName: 'spotify-get-top-dev',
        Payload: JSON.stringify({ token, type: 'tracks', time_range: 'medium_term', limit: 50, offset: 0 })
    })).body
    for (const track of topTracks) {
        tracksUris.push(track.uri);
    }



    console.log(tracksUris);
};


const updateUserTokens = async (user, tokens) => {
    console.log('Updating user tokens...', tokens);
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.spotify_access_token = tokens.access_token;
        user.spotify_expiration_timestamp = tokens.expirationTimestamp;

        if (tokens?.refresh_token) {
            user.refresh_token_spotify = tokens.refresh_token;
        }

        await documentClient.put({ TableName: "users", Item: user });
    } catch (err) {
        console.error(`Error saveTokens: ${err}`);
        throw err;
    }
};

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
};

const lambda = async (params) => {
    try {
        const command = new InvokeCommand(params);
        const data = await client.send(command);
        const rawPayload = new TextDecoder().decode(data.Payload);
        const cleanedPayload = JSON.parse(rawPayload.replace(/^"|"$/g, ''));
        return cleanedPayload.body;
    } catch (error) {
        console.error('Error invoking Lambda function:', error);
    }
};

runApp();
