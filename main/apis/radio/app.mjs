// app.mjs

import dotenv from 'dotenv';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

dotenv.config();

const documentClient = DynamoDBDocument.from(new DynamoDB({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
}));

const app = async (event, context) => {
    try {
        const serction = event.section
        console.log(`Getting ${serction}...`);
        const tableName = await randomBandcampTable(serction);
        console.log(`Retrieving albums from ${tableName}`);
        let albums = await fetchAlbums(tableName);
        if (!albums?.length) {
            console.log({ message: 'No albums found.' });
        }
        const tracks = [];
        for (const album of albums) {
            console.log(album.artist_name);
            console.log(album.name);
            for (const track of album.tracks) {
                tracks.push({ album_name: album.album_name, artist_name: album.artist_name, image_url: album.image_url, ...track });
            }
        }
        return { tracks: tracks };
    } catch (err) {
        console.error('Error processing albums:', err);
        return { message: 'Failed to process albums', err };
    }
};

const randomBandcampTable = async (serction) => {
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
        const randomTable = bandcampTables[Math.floor(Math.random() * bandcampTables.length)];
        return randomTable;
    } catch (err) {
        console.error(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
};
const fetchAlbums = async (tableName) => {
    try {
        const params = { TableName: tableName, Limit: 50 };
        const result = await documentClient.scan(params);
        return result.Items;
    } catch (err) {
        console.error(`Error fetching albums: ${err}`);
        return [];
    }
};

export { app }
