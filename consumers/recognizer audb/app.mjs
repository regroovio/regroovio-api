// recognizer/app.mjs

import { SQS } from "@aws-sdk/client-sqs";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { slackBot } from "./common/slackBot.mjs";
import axios from "axios";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));
const sqs = new SQS({ region: process.env.REGION });

const app = async () => {
    while (true) {
        try {
            await sleep(10000);
            const messages = await receiveMessagesFromSQS();
            if (!messages) continue;
            await processAndSaveAlbum(messages);
        } catch (err) {
            console.error('Error in app function:', err);
            await alertError(err, 'Error in app function');
            continue;
        }
    }
};

const processAndSaveAlbum = async (messages) => {
    for (const message of messages) {
        try {
            const album = JSON.parse(message.Body);
            const tracks = album.tracks || [];
            delete album.table;
            console.log(`\nProcessing album: ${album.album_name} | [${messages.indexOf(message) + 1}/${messages.length}]`);
            for (const track of tracks) {
                console.log(`\nProcessing track: ${track.name} | [${tracks.indexOf(track) + 1}/${tracks.length}]`);
                const response = await getTrackInfo(track.url);
                if (!response.data.result) {
                    console.log(response);
                    throw new Error('No track info found');
                }
                track.spotify = response.data.result?.spotify || null;
                track.apple_music = response.data.result?.apple_music || null;
                !track.spotify && !track.apple_music ? track.result = response.data.result : track.result = 'found';
                console.log(track);
            }
            await putAlbumInDynamodb(album.table, album);
            await deleteMessageFromSQS(message);
            console.log('Album processing completed.');
        } catch (err) {
            await alertError(err, 'Error during album processing');
            throw err;
        }
    }
    console.log(messages.length ? '\nQueue processing completed.' : '\nNo albums found.');
};


const receiveMessagesFromSQS = async () => {
    const params = {
        QueueUrl: process.env.SQS_QUEUE_PROCESS,
        MaxNumberOfMessages: 1,
        VisibilityTimeout: 900,
        WaitTimeSeconds: 0
    };
    const response = await sqs.receiveMessage(params);
    if (!response.Messages) {
        return null;
    }
    return response.Messages;
};

const deleteMessageFromSQS = async (message) => {
    const params = {
        QueueUrl: process.env.SQS_QUEUE_PROCESS,
        ReceiptHandle: message.ReceiptHandle
    };
    await sqs.deleteMessage(params);
};

const putAlbumInDynamodb = async (tableName, album) => {
    try {
        if (!tableName) throw new Error("Table name is undefined");
        if (!album) throw new Error("Album is undefined");
        const params = {
            TableName: tableName,
            Item: album
        };
        await documentClient.put(params);
    } catch (err) {
        await alertError(err, 'Error while trying to put album in DynamoDB');
    }
};

const getTrackInfo = async (track) => {
    if (!track || !process.env.AUDD_API_KEY) {
        console.log("getTrackInfo: Invalid parameters");
        return null;
    }
    try {
        console.log('fetching from audd.io: ', track);
        const response = await axios.post('https://api.audd.io/', {
            url: track,
            return: 'apple_music,spotify',
            api_token: process.env.AUDD_API_KEY,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return response;
    } catch (error) {
        console.log(error);
        return error;
    }
};

const alertError = async (err, context) => {
    const notification = {
        status: "FAILURE",
        functionName: `recognizer-${process.env.STAGE}`,
        message: `${context}: ${err.message}`,
    };
    await slackBot(notification);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export { app };
