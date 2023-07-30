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
            const notification = {
                status: "FAILURE",
                functionName: `recognizer-${process.env.STAGE}`,
                message: err.message,
            };
            await slackBot(notification);
            continue;
        }
    }
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
            await refreshTokenIfExpired(admin.user_id, admin);
            // const admin1 = await fetchAdmin();
            // if (!admin1) continue;
            return
            const processedAlbum = await processUnprocessedAlbum(album);
            if (processedAlbum === null) {
                console.log('Skipped processing album due to missing token.');
                const notification = {
                    status: "FAILURE",
                    functionName: `recognizer-${process.env.STAGE}`,
                    message: `Skipped processing album due to missing token.`,
                };
                await slackBot(notification);
                continue;
            }
            await putAlbumInDynamodb(tableName, processedAlbum);
            // await deleteMessageFromSQS(message);
            console.log('Album processing completed.');
            const notification = {
                status: "SUCCESS",
                functionName: `recognizer-${process.env.STAGE}`,
                message: `Processed [${messages.indexOf(message) + 1}/${messages.length}] albums`,
            };
            await slackBot(notification);
        } catch (err) {
            const notification = {
                status: "FAILURE",
                functionName: `recognizer-${process.env.STAGE}`,
                message: err.message,
            };
            await slackBot(notification);
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

const processUnprocessedAlbum = async (album) => {
    console.log(`\nSearching: ${album.artist_name} - ${album.album_name}`);
    for (const track of album.tracks) {
        console.log(`\nSearching track: ${track.name} - [${album.tracks.indexOf(track) + 1}/${album.tracks.length}]`);
        const processedTrack = await processTrack(token, track, album);
        if (processedTrack) {
            console.log(`Found track: ${processedTrack.body.name}`);
            track.spotify = processedTrack.body;
        } else {
            console.log(`Track not found`);
            track.spotify = null;
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
        const data = await lambdaClient.send(command);
        const rawPayload = new TextDecoder().decode(data.Payload);
        const cleanedPayload = JSON.parse(rawPayload.replace(/^"|"$/g, ''));
        return cleanedPayload.body;
    } catch (error) {
        console.log('Error invoking Lambda function:', error);
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
        console.log({ FunctionName: `spotify-scrap-token-${process.env.STAGE}`, Payload: JSON.stringify({ "user_id": adminId }) });
        const response = await invokeLambda({
            FunctionName: `spotify-scrap-token-${process.env.STAGE}`,
            Payload: JSON.stringify({ "user_id": adminId })
        });
        console.log(response);
    }
    return admin;
}

const processTrack = async (token, track, album) => {
    track.release_year = album.release_date ? album.release_date.split("-")[2] : null;
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
    console.log(targetTrack);
    return targetTrack;
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
        const notification = {
            status: "FAILURE",
            functionName: `recognizer-${process.env.STAGE}`,
            message: `Error while trying to put album in DynamoDB: ${err.message}`,
        };
        console.log(notification);
        await slackBot(notification);
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export { app };
