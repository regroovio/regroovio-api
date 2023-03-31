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
// this function will need to be modified to be able to handle multiple tables with limited runtime
const app = async (event, context) => {
    try {

        const bandcampTables = await listBandcampTables();
        for (const tableName of bandcampTables) {
            console.log(`Retrieving unprocessed albums from ${tableName}`);
            let albums = await fetchUnprocessedAlbums(tableName);
            if (!albums?.length) {
                console.log({ message: 'No unprocessed albums found.' });
            }
            console.log(`Found ${albums.length} unprocessed albums.`);
            await invokeLambdasInChunks(`bandcamp-cron-downloader-${process.env.STAGE}`, albums, tableName);
            await invokeLambdasInChunks(`bandcamp-cron-processor-${process.env.STAGE}`, albums, tableName);
        }





        return { message: 'All albums are processed.' };
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

const invokeLambdasInChunks = async (functionName, albums, tableName) => {
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
                Payload: JSON.stringify({ tableName, album })
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
