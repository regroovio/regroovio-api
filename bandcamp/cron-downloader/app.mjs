import bcfetch from 'bandcamp-fetch';
import dotenv from 'dotenv';
import { saveAlbumToS3, saveImageToS3 } from './s3.mjs';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

dotenv.config();

const documentClient = DynamoDBDocument.from(new DynamoDB({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
}));


const app = async (event, context) => {
    try {
        const table = `bandcamp-${event.table}-${process.env.STAGE}`;
        console.log(`Getting ${table}`);
        let albums = await getTableItems(table);
        if (!albums?.length) {
            return { message: 'No albums found' };
        }
        console.log(`Found albums: [${albums.length}]`);
        for (const album of albums) {
            try {
                const data = await fetchAlbumInfo(album.id);
                if (!data || !data.linkInfo || !data.streams) continue;
                const { linkInfo, streams } = data;
                const tracksS3 = await Promise.all(streams.map(stream => uploadAlbumData(stream, linkInfo)));
                const albumDetails = {
                    artist_name: linkInfo.artist.name,
                    key_words: linkInfo.keywords,
                    album_name: linkInfo.name,
                    processed: true,
                };
                albumDetails.image_url = await saveImageToS3({ imageUrl: linkInfo.imageUrl, album: linkInfo.name, artist: linkInfo.artist.name });
                albumDetails.tracks = tracksS3.filter((url) => url);
                console.log('adding', linkInfo.name);
                await addAlbumToDb(table, { ...album, ...albumDetails });
            } catch (err) {
                console.error("Error updateTrackInfo:", err);
            }
        }
        return { message: 'Done.' };
    } catch (err) {
        return { message: 'Failed', err };
    }
};

const getTableItems = async (tableName) => {
    try {
        const params = { TableName: tableName, Limit: 100 };
        let result;
        const items = [];
        do {
            result = await documentClient.scan(params);
            items.push(...result.Items);
            params.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (result.LastEvaluatedKey);
        const filteredItems = items.filter(album => !album.processed);
        return filteredItems;
    } catch (err) {
        console.error(`Error fetching items: ${err}`);
        return [];
    }
};

const fetchAlbumInfo = async (album) => {
    try {
        const linkInfo = await bcfetch.getAlbumInfo(album, { includeRawData: true });
        const streams = [...new Set(linkInfo.tracks.map((track) => {
            return { stream: track.streamUrl, name: track.name };
        }))];
        return { linkInfo, streams };
    } catch (err) {
        console.error(`Error fetching album info for ${album.id}: ${err}`);
        return { linkInfo: null, streams: null };
    }
};

const uploadAlbumData = async (stream, linkInfo) => {
    if (stream.stream) {
        const url = await saveAlbumToS3({ ...stream, album: linkInfo.name, artist: linkInfo.artist.name });
        return url;
    }
};

const addAlbumToDb = async (table, album) => {
    try {
        await documentClient
            .put({
                TableName: table,
                Item: album,
            });
    } catch (err) {
        console.log(err);
    }
};

export { app }
