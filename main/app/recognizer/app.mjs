// recognizer/app.mjs

import { SQS } from "@aws-sdk/client-sqs";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { slackBot } from "./common/slackBot.mjs";

const lambdaClient = new LambdaClient({ region: process.env.REGION });
const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));
const sqs = new SQS({ region: process.env.REGION });

const app = async () => {
    while (true) {
        try {
            await sleep(15000);
            const messages = await receiveMessagesFromSQS();
            if (!messages) continue;
            const admin = await fetchAdmin();
            if (!admin) continue;
            await processAndSaveAlbum(messages, admin);
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

const fetchAdmin = async () => {
    const admin = await getUserById(process.env.ADMIN_ID);
    if (!admin) {
        console.error("Admin user not found");
        return null;
    }
    return admin;
};

const processAndSaveAlbum = async (messages, admin) => {
    for (const message of messages) {
        try {
            const album = JSON.parse(message.Body);
            const tableName = album.table;
            delete album.table;
            console.log(`\nProcessing album: ${album.album_name} | [${messages.indexOf(message) + 1}/${messages.length}]`);
            const token = await refreshTokenIfExpired(admin.user_id, admin);
            if (!token) {
                console.log('Skipped processing album due to missing token.');
                await alertError(new Error('Missing token'), 'Skipped processing album');
                continue;
            }
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

const deleteMessageFromSQS = async (message) => {
    const params = {
        QueueUrl: process.env.SQS_QUEUE_PROCESS,
        ReceiptHandle: message.ReceiptHandle
    };
    await sqs.deleteMessage(params);
};

const processUnprocessedAlbum = async (album, token) => {
    console.log(`\nSearching: ${album.artist_name} - ${album.album_name}`);
    album.missing_tracks = [];
    for (const track of album.tracks) {
        console.log(`\nSearching track: ${track.name} - [${album.tracks.indexOf(track) + 1}/${album.tracks.length}]`);
        const processedTrack = await processTrack(token, track, album);
        if (processedTrack) {
            console.log(`Found track: ${processedTrack.body.name}`);
            track.spotify = processedTrack.body;
        } else {
            console.log(`Track not found`);
            track.spotify = null;
            album.missing_tracks.push({ name: track.name, url: track.url });
        }
    }
    return album
}

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

const invokeLambda = async (params) => {
    try {
        const command = new InvokeCommand(params);
        const { Payload } = await lambdaClient.send(command);

        const payloadString = Buffer.from(Payload).toString();
        const { body } = JSON.parse(payloadString);
        const parsedBody = JSON.parse(body);
        if (parsedBody.statusCode !== 200) {
            throw new Error(parsedBody.body || "Error invoking Lambda function");
        }
        return parsedBody;
    } catch (error) {
        console.error("Error invoking Lambda function:", error);
        throw error;
    }
};

const refreshTokenIfExpired = async (adminId, admin) => {
    if (!admin) throw new Error("Admin not found");
    const remainingTimeInMinutes = ('expiration_timestamp_spotify' in admin) ?
        (parseFloat(admin.expiration_timestamp_spotify) / 1000 - Date.now() / 1000) / 60 : -1;
    const minutes = parseInt(remainingTimeInMinutes);
    console.log("Token expires in: ", minutes, " minutes");
    if (minutes <= 15) {
        console.log("getting token...");
        const response = await invokeLambda({
            FunctionName: `spotify-scrap-token-${process.env.STAGE}`,
            Payload: JSON.stringify({ "user_id": adminId })
        });
        return response.tokens.access_token;
    }
    return admin.access_token_spotify;
}

const processTrack = async (token, track, album) => {
    track.release_year = album.release_date ? album.release_date.split("-")[2] : null;
    console.log({
        token,
        trackName: track.name,
        albumName: album.album_name,
        artistName: album.artist_name,
        year: track.release_year
    });
    try {
        const targetTrack = await invokeLambda({
            FunctionName: `spotify-search-track-${process.env.STAGE}`,
            Payload: JSON.stringify({
                token,
                trackName: track.name,
                albumName: album.album_name,
                artistName: album.artist_name,
                year: track.release_year
            })
        });
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
