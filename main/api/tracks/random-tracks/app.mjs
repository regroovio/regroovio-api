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
    const genres = event.queryStringParameters?.genres ? event.queryStringParameters.genres.split(',') : [];


    try {
        const bandcampTables = await fetchAllBandcampTables(genres);
        let allPopularTracks = [];
        const uniqueTrackIds = new Set();
        for (const tableName of bandcampTables) {
            console.log(tableName);
            let items = await fetchTracks(tableName, minPopularity, genres);
            if (!items?.length) {
                console.log({ message: 'No tracks found.' });
                continue;
            }
            console.log({ message: `Tracks found. [${items.length}]` });
            const tracks = await processTracks(items, uniqueTrackIds);
            allPopularTracks.push(...tracks);
        }
        console.log({ message: `Total tracks found. [${allPopularTracks.length}]` });
        return allPopularTracks;
    } catch (err) {
        console.error('Error processing albums:', err);
        return { message: 'Failed to process albums', err };
    }
};

const fetchAllBandcampTables = async (genres) => {
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
                if (genres.length) {
                    const genreInName = genres.some(genre => name.includes(genre));
                    return genreInName || name.includes("daily") && !name.includes("regroovio-users");
                }
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

const fetchTracks = async (tableName, minPopularity, genres) => {
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
                    if (track.spotify?.popularity && track.spotify.popularity > highestPopularity) {
                        highestPopularity = track.spotify.popularity;
                        mostPopularTrack = track;
                    } else if (isCurrentYearAlbum) {
                        mostPopularTrack = track;
                    }
                }
                // more strict genre filtering
                // if (genres.length > 0 && album?.key_words) {
                //     for (const key_word of album.key_words) {
                //         if (genres.includes(key_word)) {
                //             if (mostPopularTrack && (highestPopularity >= minPopularity || (albumYear === currentYear))) {
                //                 popularTracks.push({ track: mostPopularTrack, image: album.image, album_id: album.album_id });
                //                 selectedAlbums.add(album.album_id);
                //             }
                //         }
                //     }
                // } else {
                if (mostPopularTrack && (highestPopularity >= minPopularity || (albumYear === currentYear))) {
                    popularTracks.push({ track: mostPopularTrack, image: album.image, album_id: album.album_id, artist_name: album, album_name: album.album_name });
                    selectedAlbums.add(album.album_id);
                }
                // }

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

const processTracks = async (items, uniqueTrackIds) => {
    const tracks = [];
    for (const item of items) {
        const id = item.track.url
        if (uniqueTrackIds.has(id)) {
            continue;
        }
        uniqueTrackIds.add(id);
        const url = item.track.url;
        const title = item.track.name;
        const image = item.image;
        const album = item.album_name;
        const artist = item.artist_name;
        const album_id = item.album_id;

        tracks.push({ album_id, url, id, title, artist, album, image });
    }
    return tracks;
};

export { app }