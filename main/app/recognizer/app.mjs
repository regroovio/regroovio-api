// recognizer/app.mjs

import { SQS } from "@aws-sdk/client-sqs";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { slackBot } from "./common/slackBot.mjs";
import { search } from "./search.mjs";
import axios from "axios";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));
const sqs = new SQS({ region: process.env.REGION });

let token;

const app = async () => {
    try {
        token = await getTokenFromDB();
    } catch (err) {
        console.error('Error retrieving token from DB:', err);
        await alertError(err, 'Error retrieving token from DB');
        return;
    }
    while (true) {
        try {
            await sleep(3000);
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

const alertError = async (err, context) => {
    const notification = {
        status: "FAILURE",
        functionName: `recognizer-${process.env.STAGE}`,
        message: `${context}: ${err.message}`,
    };
    await slackBot(notification);
};

const receiveMessagesFromSQS = async () => {
    const params = {
        QueueUrl: process.env.SQS_QUEUE_PROCESS,
        MaxNumberOfMessages: 5,
        VisibilityTimeout: 900,
        WaitTimeSeconds: 0
    };
    const response = await sqs.receiveMessage(params);
    if (!response.Messages) {
        console.log('No messages to process');
        return null;
    }
    return response.Messages;
};

const processAndSaveAlbum = async (messages) => {
    for (const message of messages) {
        try {
            const album = JSON.parse(message.Body);
            const tableName = album.table;
            delete album.table;
            console.log(`\nProcessing album: ${album.album_name} | [${messages.indexOf(message) + 1}/${messages.length}]`);
            const processedAlbum = await processUnprocessedAlbum(album, token);
            if (!processedAlbum || !processedAlbum.tracks || !processedAlbum.tracks.length) {
                console.log('Skipped processing album due to missing tracks.');
                await alertError(new Error('Missing tracks'), 'Skipped processing album');
                continue;
            }
            await putAlbumInDynamodb(tableName, processedAlbum);
            console.log('Album processing completed.');
            await deleteMessageFromSQS(message);
        } catch (err) {
            await alertError(err, 'Error during album processing');
            throw err;
        }
    }
    console.log(messages.length ? '\nQueue processing completed.' : '\nNo albums found.');
};

const getTokenFromDB = async () => {
    const user_id = process.env.ADMIN_ID;
    const user = await getUserById(user_id);
    if (!user?.spotify_token || user?.spotify_token.expiration_time < new Date().toISOString()) {
        return await refreshTokenIfExpired(user_id);
    }
    return user.spotify_token.access_token || null;
};

const refreshTokenIfExpired = async (user_id) => {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const auth = 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'));
    const data = new URLSearchParams();
    data.append('grant_type', 'client_credentials');
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', data, {
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        if (response.status === 200) {
            const expirationTime = new Date();
            expirationTime.setSeconds(expirationTime.getSeconds() + response.data.expires_in);
            const token = {
                access_token: response.data.access_token,
                expiration_time: expirationTime.toISOString()
            };
            await updateUserToken(user_id, token);
            return token;
        }
        console.log(response);
        return null;
    } catch (error) {
        console.log(error);
        return null;
    }
};

const getUserById = async (user_id) => {
    try {
        const params = {
            TableName: `regroovio-users-${process.env.STAGE}`,
            Key: { user_id: user_id }
        };
        const users = await documentClient.scan(params);
        if (users.Items.length === 0) {
            throw new Error(`No user with id ${user_id} found`);
        }
        return users.Items.find(item => item.user_id === user_id);
    } catch (err) {
        console.log(`Error getUserById: ${err}`);
        throw err;
    }
};

const updateUserToken = async (user_id, token) => {
    if (!token) {
        throw new Error('Token value is undefined or empty.');
    }
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));
        const table = `regroovio-users-${process.env.STAGE}`;
        const updateParams = {
            TableName: table,
            Key: { user_id: user_id },
            UpdateExpression: "SET #tokenAttribute = :tokenVal",
            ExpressionAttributeValues: {
                ":tokenVal": token
            },
            ExpressionAttributeNames: {
                "#tokenAttribute": "spotify_token"
            }
        };
        await documentClient.update(updateParams);
    } catch (err) {
        console.log(`Error updateUserToken: ${err}`);
        throw err;
    }
};

const deleteMessageFromSQS = async (message) => {
    const params = {
        QueueUrl: process.env.SQS_QUEUE_PROCESS,
        ReceiptHandle: message.ReceiptHandle
    };
    await sqs.deleteMessage(params);
};

const processUnprocessedAlbum = async (album, token) => {
    album.popularity = 0
    album.missing_tracks = [];
    album.release_date = new Date(album.release_date).toISOString();
    for (const track of album.tracks) {
        console.log(`\nSearching track: ${track.name} - [${album.tracks.indexOf(track) + 1}/${album.tracks.length}]`);
        const processedTrack = await processTrack(token, track, album);
        if (processedTrack) {
            console.log(`Found track: ${processedTrack.name}`);
            track.spotify = processedTrack;
            album.popularity += processedTrack.popularity;
        } else {
            console.log(`Track not found`);
            track.spotify = null;
            album.missing_tracks.push({ name: track.name, url: track.url });
        }
    }
    album.statuse = album.missing_tracks.length ? 'MISSING_TRACKS' : 'PROCESSED';
    return album
}

const processTrack = async (token, track, album) => {
    track.release_year = album.release_date ? album.release_date.split("-")[2] : null;
    try {
        const targetTrack = await search({
            token,
            trackName: track.name,
            albumName: album.album_name,
            artistName: album.artist_name,
            year: track.release_year
        })
        return targetTrack;
    } catch (error) {
        console.error("Error invoking Lambda function:", error.message);
        return null;
    }
}

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export { app };
