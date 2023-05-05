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

const app = async (event) => {
    try {
        const bandcampTables = await fetchAllBandcampTables();
        for (const tableName of bandcampTables) {
            console.log(tableName);
            let items = await fetchTracks(tableName);
            if (!items?.length) {
                console.log({ message: 'No tracks found.' });
                continue;
            }
            console.log(items);
        }
    } catch (err) {
        console.error('Error processing albums:', err);
        return { message: 'Failed to process albums', err };
    }
};

const fetchAllBandcampTables = async () => {
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
            bandcampTables.push(...result.TableNames.filter(name => {
                return name.includes("daily");
            }));
            params.ExclusiveStartTableName = result.LastEvaluatedTableName;
        } while (result.LastEvaluatedTableName);
        return bandcampTables;
    } catch (err) {
        console.error(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
};

const fetchTracks = async (tableName) => {
    try {
        const tracks = [];
        const params = { TableName: tableName };
        const result = await documentClient.scan(params);
        for (const album of result.Items) {
            if (album.tracks) {
                for (const track of album.tracks) {
                    if (track) {
                        tracks.push(`https://albums-regroovio.s3.amazonaws.com/${atob(track.url)}`);
                    }
                }
            }
        }
        params.ExclusiveStartKey = result.LastEvaluatedKey;
        return tracks;
    } catch (err) {
        console.error(`Error fetching albums: ${err}`);
        return [];
    }
};


export { app }