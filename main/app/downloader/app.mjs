
// app.mjs

import bcfetch from 'bandcamp-fetch';
import dotenv from 'dotenv';
import { saveTrackToS3, saveImageToS3 } from './s3.mjs';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

dotenv.config();

const client = new DynamoDB({
    region: process.env.REGION
});

const documentClient = DynamoDBDocument.from(client);

const app = async (event, context) => {
    const { tableName } = event;
    try {
        const { Items } = await documentClient.scan({
            TableName: tableName,
        });
        for (const album of Items) {
            if (!album?.url) {
                console.log(`Album already processed: ${album.album_id}`);
                continue;
            }
            await processAndSaveAlbum(album, tableName)
            console.log('Albums processing completed.');
        }
    } catch (err) {
        console.error('Error in app function:', err);
        throw err;
    }
};

const processAndSaveAlbum = async (album, tableName) => {
    try {
        const data = await fetchAlbumData(album.url);
        if (!data || !data.linkInfo || !data.streams) return;
        const { linkInfo, streams } = data;
        const tracksS3 = (await Promise.all(streams.map(stream => downloadTrack(stream, linkInfo)))).filter(track => track !== undefined);
        console.log(tracksS3);
        const albumWithDetails = await generatealbumWithDetails(linkInfo, tracksS3, album);
        console.log('Adding album:', albumWithDetails.album_name);
        await saveAlbumToDatabase(tableName, albumWithDetails);
        return albumWithDetails;
    } catch (err) {
        console.error("Error in processAndSaveAlbum function:", err);
        throw err;
    }
};

const generatealbumWithDetails = async (linkInfo, tracksS3, album) => {
    let imageId = await saveImageToS3({ imageUrl: linkInfo.imageUrl, album: linkInfo.name, artist: linkInfo.artist.name });
    const d = linkInfo.releaseDate?.split(' ')[0]
    const m = linkInfo.releaseDate?.split(' ')[1]
    const y = linkInfo.releaseDate?.split(' ')[2]
    const release_date = d && m && y ? `${d}-${m}-${y}` : null
    if (!imageId) {
        failed = true
        imageId = null
    }
    if (!tracksS3.length) {
        failed = true
        tracksS3 = null
    }
    if (tracksS3.length && imageId) {
        delete album.url;
    }
    return {
        ...album,
        artist_name: linkInfo.artist.name,
        key_words: linkInfo.keywords,
        release_date: release_date,
        album_name: linkInfo.name,
        image: imageId,
        tracks: tracksS3
    };
};

const fetchAlbumData = async (album) => {
    if (!album) {
        console.log("Album is undefined");
        throw new Error("Album is undefined");
    }
    try {
        const linkInfo = await bcfetch.getAlbumInfo(album, { includeRawData: true });
        const streams = [...new Set(linkInfo.tracks.map((track) => {
            return { stream: track.streamUrl, name: track.name };
        }))];
        return { linkInfo, streams };
    } catch (err) {
        console.error(`Error fetching album data for ${album.album_id}:`, err);
        throw err;
    }
};

const downloadTrack = async (stream, linkInfo) => {
    if (stream.stream) {
        console.log(`Downloading track: `, stream.name);
        const trackUrl = await saveTrackToS3({ ...stream, album: linkInfo.name, artist: linkInfo.artist.name });
        const track = { url: trackUrl, name: stream.name };
        return track;
    } else {
        console.log(`Undefined track: `, stream);
        return
    }
};

const saveAlbumToDatabase = async (tableName, album) => {
    try {
        await documentClient.put({
            TableName: tableName,
            Item: album,
        });
    } catch (err) {
        console.error(`Error saving album to database:`, err);
        console.log('Table:', tableName);
        console.log('Album:', album);
        throw err;
    }
};

export { app }
