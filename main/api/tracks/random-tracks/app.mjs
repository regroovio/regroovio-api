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
    const minPopularity = event.queryStringParameters?.popularity || 0;

    try {
        const bandcampTables = await fetchAllBandcampTables();
        let allPopularTracks = [];
        for (const tableName of bandcampTables) {
            console.log(tableName);
            let items = await fetchTracks(tableName, minPopularity);
            if (!items?.length) {
                console.log({ message: 'No tracks found.' });
                continue;
            }
            console.log({ message: `Tracks found. [${items.length}]` });
            const tracks = await processTracks(items);
            allPopularTracks.push(...tracks);
        }
        console.log({ message: `Total tracks found. [${allPopularTracks.length}]` });
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
            bandcampTables.push(...result.TableNames.filter(name => name.includes("regroovio")));
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

                const albumYear = parseInt(album.release_date?.split('-')[2]) || null;
                const currentYear = new Date().getFullYear();

                for (const track of album.tracks || []) {
                    const isCurrentYearAlbum = albumYear === currentYear;
                    if (track.spotify?.popularity && (track.spotify.popularity > highestPopularity || isCurrentYearAlbum)) {
                        highestPopularity = track.spotify.popularity;
                        mostPopularTrack = track;
                    }
                }

                if (mostPopularTrack && (highestPopularity >= minPopularity || (albumYear === currentYear))) {
                    popularTracks.push({ track: mostPopularTrack, image: album.image, album_id: album.album_id });
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

        const popularity = item.track.spotify.popularity;
        const artist = item.track.spotify.artists[0].name
        const id = item.track.spotify.id
        const album_id = item.album_id
        const album = item.track.album
        const title = item.track.name
        const url = item.track.url
        const image = item.image

        tracks.push({ album_id, url, id, title, artist, popularity, album, image });
        console.log(tracks[0]);
    }
    return tracks;
};

export { app }