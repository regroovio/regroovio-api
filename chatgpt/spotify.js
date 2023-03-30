// spotify.js

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getUserById } from "./common/getUserById.mjs";

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./common/config.mjs";

const client = new LambdaClient({ region: 'us-east-1' });

const runApp = async () => {

    const user_id = process.env.ADMIN_ID;
    const user = await getUserById(user_id);
    let token = user.spotify_access_token
    let tokens
    const remainingTime = user.spotify_expiration_timestamp - new Date().getTime();
    const isTokenExpiringSoon = remainingTime <= 30 * 60 * 1000;


    if (isTokenExpiringSoon) {
        console.log('Token is expiring soon, refreshing...');
        tokens = await getToken({
            FunctionName: 'spotify-token-dev',
            Payload: JSON.stringify({ user_id })
        });
        tokens = JSON.parse(tokens);
        try {
            const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
            user.spotify_access_token = tokens.access_token;
            console.log('access_token ', tokens.access_token);
            console.log('expiration_timestamp_spotify ', tokens.expirationTimestamp);
            user.expiration_timestamp_spotify = tokens.expirationTimestamp;
            if (tokens?.refresh_token) {
                console.log('refresh_token ', tokens.refresh_token);
                user.refresh_token_spotify = tokens.refresh_token;
            }
            await documentClient.put({ TableName: "users", Item: user });
            token = tokens.access_token
        } catch (err) {
            console.error(`Error saveTokens: ${err}`);
            throw err;
        }
    }


    const likedTracks = await getPlaylist({
        FunctionName: 'spotify-get-likes-dev',
        Payload: JSON.stringify({ token, limit: 100, offset: 0 })
    });
    console.log(likedTracks);
}


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
}

const getPlaylist = async (params) => {
    try {
        const command = new InvokeCommand(params);
        const data = await client.send(command);
        const rawPayload = new TextDecoder().decode(data.Payload);
        const cleanedPayload = JSON.parse(rawPayload.replace(/^"|"$/g, ''));
        return cleanedPayload.body;
    } catch (error) {
        console.error('Error invoking Lambda function:', error);
    }
}


runApp()