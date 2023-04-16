// app.mjs

import dotenv from 'dotenv';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getUserById } from './common/getUserById.mjs';
import { AWS_DYNAMO } from './common/config.mjs';
import { slackBot } from './common/slackBot.mjs';

dotenv.config();

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const documentClient = DynamoDBDocument.from(new DynamoDB({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
}));

const app = async (event, context) => {
    const { table } = event
    try {
        console.log(`Getting ${table}...`);
        const bandcampTables = await listBandcampTables(table);
        for (const tableName of bandcampTables) {
            console.log(`Retrieving unsaved albums from ${tableName}`);

            let unsavedAlbums = await fetchUnsavedAlbums(tableName);
            if (!unsavedAlbums?.length) {
                console.log({ message: 'No unsaved albums found.' });
            }
            console.log(`Found ${unsavedAlbums.length} unsaved albums.`);
            await invokeLambdasInChunks(`bandcamp-worker-downloader-${process.env.STAGE}`, unsavedAlbums, tableName);

            console.log(`Retrieving unprocessed albums from ${tableName}`);
            let unprocessedAlbums = await fetchUnprocessedAlbums(tableName);
            if (!unprocessedAlbums?.length) {
                console.log({ message: 'No unprocessed albums found.' });
                return
            }
            const admin_id = process.env.ADMIN_ID;
            let admin = await getUserById(admin_id);
            if (!admin) {
                console.error('User not found');
                return;
            }

            let token = admin.access_token_spotify || null;
            const remainingTimeInMinutes = (admin.expiration_timestamp_spotify - Date.now()) / 1000 / 60;
            console.log(`Token expires in: ${remainingTimeInMinutes.toFixed(0)} minutes`);

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
            for (let i = 0; i < unprocessedAlbums.length; i++) {
                console.log(`Searching ${i + 1} of ${unprocessedAlbums.length}`);
                await invokeLambda({
                    FunctionName: `spotify-search-track-${process.env.STAGE}`,
                    Payload: JSON.stringify({
                        token, trackName: "El Layali",
                        albumName: "Amor Fati",
                        year: "2021",
                    })
                });
            }
            // for (let i = 0; i < unprocessedAlbums.length; i++) {
            //     console.log(`Processing ${i + 1} of ${unprocessedAlbums.length}`);
            //     await invokeLambda({
            //         FunctionName: `bandcamp-worker-processor-${process.env.STAGE}`,
            //         Payload: JSON.stringify({ tableName, album: unprocessedAlbums[i], token })
            //     });
            // }
        }
        const response = { functionName: `bandcamp-cron-processor-${process.env.STAGE}`, message: `Success. Table ${table} saved.` }
        await slackBot(response);
        return response;
    } catch (error) {
        const response = { functionName: table, message: error.message }
        await slackBot(response);
        throw new Error(`Failed to process albums: ${error}`);
    }
};

const listBandcampTables = async (table) => {
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
            bandcampTables.push(...result.TableNames.filter(name => name.includes(table)));
            params.ExclusiveStartTableName = result.LastEvaluatedTableName;
        } while (result.LastEvaluatedTableName);

        return bandcampTables;
    } catch (err) {
        console.error(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
};

const invokeLambdasInChunks = async (functionName, albums, tableName, token) => {
    let chunkSize = 5;

    if (albums.length < chunkSize) {
        chunkSize = albums.length;
    }

    for (let i = 0; i < albums.length; i += chunkSize) {
        const chunk = albums.slice(i, i + chunkSize);
        console.log(`Downloading chunk ${i / chunkSize + 1} of ${Math.ceil(albums.length / chunkSize)}`);

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
        await documentClient.put({ TableName: `users-${process.env.STAGE}`, Item: user });
    } catch (err) {
        console.error(`Error updateUserTokens: ${err}`);
        throw err;
    }
};

export { app }
