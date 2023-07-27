
// app.mjs

import bcfetch from 'bandcamp-fetch';
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { saveTrackToS3, saveImageToS3 } from './s3.mjs';

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const app = async () => {
    while (true) {
        try {
            await runProcess();
            await new Promise(resolve => setTimeout(resolve, 60000));
        } catch (err) {
            console.log('Error in app function:', err);
            throw err;
        }
    }
};

const runProcess = async () => {
    const tableName = process.env.TABLE_NAME;
    console.log(`\nProcessing table: ${tableName}`);
    try {
        const albums = await getUnSaveAlbums(tableName);
        for (const album of albums) {
            console.log(`\nProcessing album: ${album.url} | [${albums.indexOf(album) + 1}/${albums.length}]`);
            await processAndSaveAlbum(album, tableName)
            console.log('Album processing completed.');
        }
        console.log(albums.length ? '\nTable processing completed.' : '\nNo albums found.');
    } catch (err) {
        console.log('Error in app function:', err);
        throw err;
    }
};

const getUnSaveAlbums = async (table) => {
    const params = {
        TableName: table,
        FilterExpression: "attribute_exists(#url)",
        ExpressionAttributeNames: {
            "#url": "url"
        }
    };
    try {
        const albums = await documentClient.scan(params);
        return albums.Items.length ? albums.Items : [];
    } catch (err) {
        console.log('Error in getUnSaveAlbums function:', err);
        throw err;
    }
}

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
        console.log("Error in processAndSaveAlbum function:", err);
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
        console.log(`Error fetching album data for ${album.album_id}:`, err);
        throw err;
    }
};

const downloadTrack = async (stream, linkInfo) => {
    if (stream.stream) {
        console.log(`\nDownloading track: `, stream.name);
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
        console.log(`Error saving album to database:`, err);
        console.log('Table:', tableName);
        console.log('Album:', album);
        throw err;
    }
};

export { app }
