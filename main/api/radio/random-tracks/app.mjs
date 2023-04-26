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


const app = async (event) => {
    const minPopularity = event.queryStringParameters?.popularity || 0
    console.log(minPopularity);

    try {
        const bandcampTables = await fetchAllBandcampTables();
        console.log(bandcampTables);
        let allPopularTracks = [];
        for (const tableName of bandcampTables) {
            console.log(`Retrieving tracks from ${tableName}`);
            let items = await fetchTracks(tableName, minPopularity);
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
            bandcampTables.push(...result.TableNames.filter(name => name.includes('bandcamp') && name.includes(process.env.STAGE) || name.includes('X9gHk7zL')));
            params.ExclusiveStartTableName = result.LastEvaluatedTableName;
        } while (result.LastEvaluatedTableName);
        return bandcampTables;
    } catch (err) {
        console.error(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
};

const fetchTracks = async (tableName, minPopularity) => {
    try {
        let popularTracks = [];
        let selectedAlbums = new Set();

        let result;
        let params = { TableName: tableName };

        do {
            result = await documentClient.scan(params);
            const shuffledAlbums = shuffleArray(result.Items);

            for (const album of shuffledAlbums) {
                if (selectedAlbums.has(album.album_id)) {
                    continue;
                }
                let mostPopularTrack = null;
                let highestPopularity = 0;

                for (const track of album.tracks || []) {
                    const albumYear = album.release_date?.split(' ')[2] || null
                    const currentYear = new Date().getFullYear();
                    if (track.spotify && albumYear >= currentYear - 1) {
                        highestPopularity = track.spotify.popularity;
                        mostPopularTrack = track;
                    }
                    if (track.spotify?.popularity && track.spotify.popularity > highestPopularity) {
                        highestPopularity = track.spotify.popularity;
                        mostPopularTrack = track;
                    }
                }

                if (mostPopularTrack && highestPopularity >= minPopularity) {
                    popularTracks.push({ track: mostPopularTrack, image_key: album.image_key.key });
                    selectedAlbums.add(album.album_id);
                }
            }

            params.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (result.LastEvaluatedKey);

        return popularTracks;
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
            Bucket: 'albums-regroovio',
            Key: item.image_key,
        });
        const image = await getSignedUrl(s3, imageCommand, { expiresIn: 604800 });
        const trackCommand = new GetObjectCommand({
            Bucket: 'albums-regroovio',
            Key: item.track.key,
        });
        const url = await getSignedUrl(s3, trackCommand, { expiresIn: 604800 });
        tracks.push({ artist: item.track.spotify.artists[0].name, album: item.track.spotify.album, title: item.track.name, image_url: image, track_url: url, popularity: item.track.spotify.popularity });
    }
    return tracks;
};

export { app }