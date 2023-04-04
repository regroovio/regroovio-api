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
        const bandcampTables = await fetchAllBandcampTables();
        let allPopularTracks = [];
        for (const tableName of bandcampTables) {
            console.log(`Retrieving tracks from ${tableName}`);
            let items = await fetchTracks(tableName);
            if (!items?.length) {
                console.log({ message: 'No tracks found.' });
                continue;
            }
            const tracks = await processTracks(items);
            allPopularTracks.push(...tracks);
        }
        return allPopularTracks;
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
            bandcampTables.push(...result.TableNames.filter(name => name.includes('bandcamp') && name.includes(process.env.STAGE)));
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
        const params = { TableName: tableName };
        const result = await documentClient.scan(params);
        const shuffledAlbums = shuffleArray(result.Items);
        const populareTracks = []
        for (const album of shuffledAlbums) {
            for (const track of album.tracks || []) {
                if (track.spotify?.popularity) {
                    if (track.spotify.popularity > 20) {
                        populareTracks.push({ track, image_url: album.image_url });
                    }
                }
            }
        }
        return populareTracks;
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

const processTracks = async (items) => {

    const tracks = [];
    for (const item of items) {
        const imageCommand = new GetObjectCommand({
            Bucket: item.image_url.bucket,
            Key: item.image_url.key,
        });
        const image = await getSignedUrl(s3, imageCommand, { expiresIn: 60 * 60 });

        const trackCommand = new GetObjectCommand({
            Bucket: item.track.bucket,
            Key: item.track.key,
        });
        const url = await getSignedUrl(s3, trackCommand, { expiresIn: 60 * 60 });
        tracks.push({ artist: item.track.spotify.artists[0].name, album: item.track.spotify.album, title: item.track.name, image_url: image, track_url: url, popularity: item.track.spotify.popularity });
    }
    return tracks;
};

export { app }