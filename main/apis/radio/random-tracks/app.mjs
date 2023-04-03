// app.mjs

import dotenv from 'dotenv';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const s3 = new S3Client({ region: 'us-east-1' });;

const documentClient = DynamoDBDocument.from(new DynamoDB({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
}));

const app = async () => {
    try {
        const tableName = await randomBandcampTable();
        console.log(`Getting ${tableName}...`);
        console.log(`Retrieving albums from ${tableName}`);
        let albums = await fetchAlbums(tableName);
        if (!albums?.length) {
            console.log({ message: 'No albums found.' });
        }

        const tracks = [];
        for (const album of albums) {
            const params = {
                Bucket: album.image_url.bucket,
                Key: album.image_url.key,
            };
            const command = new GetObjectCommand(params);
            const image = await getSignedUrl(s3, command, { expiresIn: 60 * 60 });
            for (const track of album.tracks) {
                const params = {
                    Bucket: track.bucket,
                    Key: track.key,
                };
                const command = new GetObjectCommand(params);
                const url = await getSignedUrl(s3, command, { expiresIn: 60 * 60 });
                tracks.push({ artist: album.artist_name, album: album.album_name, title: track.name, image_url: image, track_url: url });
            }
        }
        return tracks
    } catch (err) {
        console.error('Error processing albums:', err);
        return { message: 'Failed to process albums', err };
    }
};

const randomBandcampTable = async () => {
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
        const shuffledAlbums = shuffleArray(result.Items);
        return shuffledAlbums;
    } catch (err) {
        console.error(`Error fetching albums: ${err}`);
        return [];
    }
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export { app }