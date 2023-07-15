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
    console.log(event);
    const minPopularity = event.queryStringParameters?.popularity || 0;
    const limit = event.queryStringParameters?.limit || 10; // Default limit of 10 if not specified
    try {
        const bandcampTables = await fetchAllBandcampTables();
        let allPopularTracks = [];
        const uniqueTrackIds = new Set();

        const fetchTracksPromises = bandcampTables.map(async (tableName) => {
            console.log(tableName);
            let items = await fetchTracks(tableName, minPopularity, limit);
            if (!items?.length) {
                console.log({ message: 'No tracks found.' });
                return [];
            }
            console.log({ message: `Tracks found. [${items.length}]` });
            return processTracks(items, uniqueTrackIds);
        });

        const allTracks = await Promise.all(fetchTracksPromises);
        allTracks.forEach(tracks => {
            allPopularTracks.push(...tracks);
        });

        console.log({ message: `Total tracks found. [${allPopularTracks.length}]` });
        return allPopularTracks.slice(0, limit); // Ensure the total result also respects the limit
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
                return name.includes("regroovio") && !name.includes("regroovio-users");
            }));
            params.ExclusiveStartTableName = result.LastEvaluatedTableName;
        } while (result.LastEvaluatedTableName);
        return bandcampTables;
    } catch (err) {
        console.error(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
};

const fetchTracks = async (tableName, minPopularity, limit) => {
    try {
        const params = {
            TableName: tableName,
            KeyConditionExpression: "spotify.popularity >= :minPopularity",
            ExpressionAttributeValues: {
                ":minPopularity": minPopularity
            },
            ScanIndexForward: false, // this sorts results by sort key (popularity) in descending order
            Limit: limit
        };

        const result = await documentClient.query(params);

        return processTracks(result.Items);
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

const processTracks = (items, uniqueTrackIds) => {
    const tracks = [];
    for (const item of items) {
        const id = item.track.url;
        if (uniqueTrackIds.has(id)) {
            continue;
        }
        uniqueTrackIds.add(id);
        const popularity = item.track?.spotify?.popularity || null;
        const artist = item.artist_name;
        const album_id = item.album_id;
        const album = item.album_name;
        const title = item.track.name;
        const url = item.track.url;
        const image = item.image;
        tracks.push({ album_id, url, id, title, artist, popularity, album, image });
    }
    return tracks;
};

export { app }