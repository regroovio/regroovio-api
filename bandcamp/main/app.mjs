// app.mjs

import dotenv from 'dotenv';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
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
        const tableName = `bandcamp-${event.table}-${process.env.STAGE}`;
        console.log(`Retrieving unprocessed albums from ${tableName}`);
        let albums = await fetchUnprocessedAlbums(tableName);
        if (!albums?.length) {
            return { message: 'No unprocessed albums found.' };
        }
        console.log(`Found ${albums.length} unprocessed albums.`);
        await invokeLambdasInChunks(albums, tableName);
        return { message: 'All albums processed.' };
    } catch (err) {
        console.error('Error processing albums:', err);
        return { message: 'Failed to process albums', err };
    }
};

const invokeLambdasInChunks = async (albums, tableName) => {
    const chunkSize = 10;

    for (let i = 0; i < albums.length; i += chunkSize) {
        const chunk = albums.slice(i, i + chunkSize);
        console.log(`Processing chunk ${i / chunkSize + 1} of ${Math.ceil(albums.length / chunkSize)}`);

        await Promise.all(chunk.map(async (album) => {
            const response = await invokeLambda({
                FunctionName: 'bandcamp-cron-downloader-dev',
                Payload: JSON.stringify({ tableName, album })
            });
            console.log(`Album processed: ${album.id}. Response:`, response);
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
        const unprocessedAlbums = items.filter(album => !album.processed);
        return unprocessedAlbums;
    } catch (err) {
        console.error(`Error fetching unprocessed albums: ${err}`);
        return [];
    }
};

export { app }
