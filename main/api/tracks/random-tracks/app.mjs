// app.mjs

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamoDB = new DynamoDB({ region: process.env.REGION });
const documentClient = DynamoDBDocument.from(dynamoDB);

const app = async (event) => {
    console.log(event);
    const minPopularity = event.queryStringParameters?.popularity || 0;
    try {
        let bandcampTables = await fetchBandcampTables();
        let allPopularTracks = [];

        const fetchTracksPromises = bandcampTables.map(async (tableName) => {
            console.log(tableName);
            const albums = await fetchAlbums(tableName, minPopularity);
            console.log({ message: `Albums found. [${albums.length}]` });
            return processTracks(albums);
        });

        const allTracks = await Promise.all(fetchTracksPromises);
        allTracks.forEach(tracks => {
            allPopularTracks.push(...tracks);
        });

        console.log({ message: `Total tracks found. [${allPopularTracks.length}]` });
        allPopularTracks.sort(() => Math.random() - 0.5);
        return allPopularTracks
    } catch (err) {
        console.log('Error processing albums:', err);
        return { message: 'Failed to process albums', err };
    }
};

const fetchBandcampTables = async () => {
    try {
        let result;
        let bandcampTables = [];
        let params = {};
        do {
            result = await dynamoDB.listTables(params);
            bandcampTables.push(...result.TableNames.filter(name => {
                return !name.includes("regroovio-users") && name.includes(process.env.STAGE);
            }));
            params.ExclusiveStartTableName = result.LastEvaluatedTableName;
        } while (result.LastEvaluatedTableName);
        return bandcampTables;
    } catch (err) {
        console.log(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
};

const fetchAlbums = async (tableName, minPopularity) => {
    try {
        const params = {
            TableName: tableName,
            FilterExpression: "popularity >= :minPopularity",
            ExpressionAttributeValues: {
                ":minPopularity": minPopularity
            },
            ScanIndexForward: false,
        };
        const result = await documentClient.scan(params);
        return result.Items
    } catch (err) {
        console.log(`Error fetching albums: ${err}`);
        return [];
    }
};

const processTracks = (albums) => {
    const tracks = [];
    for (const albumItem of albums) {
        if (albumItem.tracks.length > 0) {
            const track = albumItem.tracks.sort((a, b) => {
                const popularityA = a.spotify?.popularity || 0;
                const popularityB = b.spotify?.popularity || 0;
                return popularityB - popularityA;
            })[0];
            const id = track.url;
            const popularity = track?.spotify?.popularity || null;
            const artist = albumItem.artist_name;
            const album_id = albumItem.album_id;
            const album = albumItem.album_name;
            const title = track.name;
            const url = track.url;
            const image = albumItem.image;
            const key_words = albumItem.key_words;
            const release_date = albumItem.release_date;
            tracks.push({ album_id, url, id, title, artist, popularity, album, image, key_words, release_date });
        }
    }
    return tracks;
};

export { app }