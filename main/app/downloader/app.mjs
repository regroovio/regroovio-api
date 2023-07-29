
// downloader/app.mjs

import bcfetch from 'bandcamp-fetch';
import { SQS } from "@aws-sdk/client-sqs";
import { saveTrackToS3, saveImageToS3 } from './s3.mjs';
import { slackBot } from './common/slackBot.mjs';

const sqs = new SQS({ region: process.env.REGION });

const app = async () => {
    while (true) {
        try {
            await sleep(15000);
            const messages = await receiveMessagesFromSQS();
            if (!messages) continue;
            await runProcess(messages);
        } catch (err) {
            console.error('Error in app function:', err);
            throw err;
        }
    }
};

const receiveMessagesFromSQS = async () => {
    const params = {
        QueueUrl: process.env.SQS_QUEUE_DOWNLOADS,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 900,
        WaitTimeSeconds: 0
    };
    const response = await sqs.receiveMessage(params);
    if (!response.Messages) {
        console.log('No messages to process');
        return null;
    }

    console.log(`Received ${response.Messages.length} messages from SQS`);
    return response.Messages;
};

const runProcess = async (messages) => {
    try {
        for (const message of messages) {
            const album = JSON.parse(message.Body);
            const processedAlbum = await downloadAndSaveAlbum(album);
            await deleteAndSendNewMessage(message, processedAlbum);
        }
        const notification = {
            status: "SUCCESS",
            functionName: `downloader-${process.env.STAGE}`,
            scanned: albumLinks.length,
            added: albumsAdded.length
        };
        await slackBot(notification);
    } catch (err) {
        const notification = {
            status: "FAILURE",
            functionName: `downloader-${process.env.STAGE}`,
            message: err.message,
        };
        await slackBot(notification);
        throw err;
    }
};

const downloadAndSaveAlbum = async (album) => {
    try {
        const data = await fetchAlbumData(album.url);
        if (!data || !data.linkInfo || !data.streams) return;
        const { linkInfo, streams } = data;
        const tracksS3 = (await Promise.all(streams.map(stream => downloadTrack(stream, linkInfo)))).filter(track => track !== undefined);
        console.log(tracksS3);
        const processedAlbum = await generatealbumWithDetails(linkInfo, tracksS3, album);
        console.log('Adding album:', processedAlbum.album_name);
        return processedAlbum;
    } catch (err) {
        console.log("Error in downloadAndSaveAlbum function:", err);
        throw err;
    }
};

const deleteAndSendNewMessage = async (message, processedAlbum) => {
    await sqs.deleteMessage({
        QueueUrl: process.env.SQS_QUEUE_DOWNLOADS,
        ReceiptHandle: message.ReceiptHandle
    });
    await sqs.sendMessage({
        QueueUrl: process.env.SQS_QUEUE_PROCESS,
        MessageBody: JSON.stringify(processedAlbum)
    });
};

const generatealbumWithDetails = async (linkInfo, tracksS3, album) => {
    let imageId = await saveImageToS3({ imageUrl: linkInfo.imageUrl, album: linkInfo.name, artist: linkInfo.artist.name });
    let failed = false
    const d = linkInfo.releaseDate?.split(' ')[0]
    const m = linkInfo.releaseDate?.split(' ')[1]
    const y = linkInfo.releaseDate?.split(' ')[2]
    const release_date = d && m && y ? `${d}-${m}-${y}` : null
    if (!imageId || !tracksS3.length) {
        failed = true
        imageId = null
    }
    return {
        ...album,
        artist_name: linkInfo.artist.name,
        key_words: linkInfo.keywords,
        release_date: release_date,
        album_name: linkInfo.name,
        image: imageId,
        tracks: tracksS3,
        status: failed ? 'download failed' : 'download success'
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export { app }
