// app.mjs

import dotenv from 'dotenv';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getUserById } from './common/getUserById.mjs';
import { AWS_DYNAMO } from './common/config.mjs';

dotenv.config();

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const documentClient = DynamoDBDocument.from(new DynamoDB({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
}));
// this function will need to be modified to be able to handle multiple tables with limited runtime
const app = async (event, context) => {
    try {
        const bandcampTables = await listBandcampTables();
        for (const tableName of bandcampTables) {
            console.log(`Retrieving unsaved albums from ${tableName}`);

            let unsavedAlbums = await fetchUnsavedAlbums(tableName);
            if (!unsavedAlbums?.length) {
                console.log({ message: 'No unsaved albums found.' });
            }
            console.log(`Found ${unsavedAlbums.length} unsaved albums.`);
            await invokeLambdasInChunks(`bandcamp-cron-downloader-${process.env.STAGE}`, unsavedAlbums, tableName);
            let unprocessedAlbums = await fetchUnprocessedAlbums(tableName);
            if (!unprocessedAlbums?.length) {
                console.log({ message: 'No unprocessed albums found.' });
            }
            const admin_id = process.env.ADMIN_ID;
            let admin = await getUserById(admin_id);
            if (!admin) {
                console.error('User not found');
                return;
            }
            let token = admin.access_token_spotify || null;
            const remainingTimeInMinutes = (admin.expiration_timestamp_spotify - Date.now()) / 1000 / 60;
            console.log("Remaining time in minutes:", remainingTimeInMinutes.toFixed(0));
            if (remainingTimeInMinutes <= 15) {
                console.log('Token is expiring soon or already expired, refreshing...');
                const rawTokens = await invokeLambda({
                    FunctionName: `spotify-token-${process.env.STAGE}`,
                    Payload: JSON.stringify({ user_id: admin_id })
                });
                const tokens = JSON.parse(rawTokens);
                await updateUserTokens(admin, tokens);
                token = tokens.access_token;
            }
            console.log(`Found ${unprocessedAlbums.length} unprocessed albums.`);
            await invokeLambdasInChunks(`bandcamp-cron-processor-${process.env.STAGE}`, unprocessedAlbums, tableName, token);
        }
        return { message: 'All albums are saved.' };
    } catch (err) {
        console.error('Error processing albums:', err);
        return { message: 'Failed to process albums', err };
    }
};

const listBandcampTables = async () => {
    const dynamoDB = new DynamoDB({
        region: process.env.REGION,
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    });

    try {
        let result;
        let bandcampTables = [];
        let params = {};

        do {
            result = await dynamoDB.listTables(params);
            bandcampTables.push(...result.TableNames.filter(name => name.includes('bandcamp') && name.includes(process.env.STAGE)));
            params.ExclusiveStartTableName = result.LastEvaluatedTableName;
        } while (result.LastEvaluatedTableName);

        return bandcampTables;
    } catch (err) {
        console.error(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
};

const invokeLambdasInChunks = async (functionName, albums, tableName, token) => {
    let chunkSize = 10;

    if (albums.length < 10) {
        chunkSize = albums.length;
    }

    for (let i = 0; i < albums.length; i += chunkSize) {
        const chunk = albums.slice(i, i + chunkSize);
        console.log(`Processing chunk ${i / chunkSize + 1} of ${Math.ceil(albums.length / chunkSize)}`);

        await Promise.all(chunk.map(async (album) => {
            await invokeLambda({
                FunctionName: functionName,
                Payload: JSON.stringify({ tableName, album, token: token ? token : null })
            });
        }));
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

const fetchUnsavedAlbums = async (tableName) => {
    try {
        const params = { TableName: tableName, Limit: 100 };
        let result;
        const items = [];
        do {
            result = await documentClient.scan(params);
            items.push(...result.Items);
            params.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (result.LastEvaluatedKey);
        const unsavedAlbums = items.filter(album => !album.saved);
        return unsavedAlbums;
    } catch (err) {
        console.error(`Error fetching unsaved albums: ${err}`);
        return [];
    }
};

const fetchUnprocessedAlbums = async (tableName) => {
    try {
        const params = { TableName: tableName, Limit: 100 };
        let result;
        const items = [];
        do {
            result = await documentClient.scan(params);
            items.push(...result.Items);
            params.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (result.LastEvaluatedKey);
        const unprocessedAlbums = items.filter(album => album.saved && !album.processed);
        return unprocessedAlbums;
    } catch (err) {
        console.error(`Error fetching unprocessed albums: ${err}`);
        return [];
    }
};

const updateUserTokens = async (user, tokens) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.access_token_spotify = tokens.access_token;
        user.expiration_timestamp_spotify = tokens.expiration_timestamp;
        if (tokens?.refresh_token) {
            user.refresh_token_spotify = tokens.refresh_token;
        }
        await documentClient.put({ TableName: "users", Item: user });
    } catch (err) {
        console.error(`Error updateUserTokens: ${err}`);
        throw err;
    }
};

export { app }
