// app.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: process.env.REGION });
const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const app = async (event) => {
    while (true) {
        try {
            await runProcess(event);
            await new Promise(resolve => setTimeout(resolve, 60000));
        } catch (err) {
            console.log('Error in app function:', err);
            throw err;
        }
    }
};

const runProcess = async (event) => {
    const tableName = process.env.TABLE_NAME;
    console.log(`\nProcessing table: ${tableName}`);
    try {
        const albums = await getUnprocessedAlbums(tableName);
        const admin = await getUserById(process.env.ADMIN_ID)
        if (!admin) {
            console.log("User not found");
            return;
        }
        for (const album of albums) {
            console.log(`\nProcessing album: ${album.album_name} - [${album.album_id}] | [${albums.indexOf(album) + 1}/${albums.length}]`);
            await processUnprocessedAlbum(album, admin)
            console.log('Album processing completed.');
        }
        console.log(albums.length ? '\nTable processing completed.' : '\nNo albums found.');
    } catch (err) {
        console.log('Error in runProcess function:', err);
        throw err;
    }
};

const getUnprocessedAlbums = async (table) => {
    const params = {
        TableName: table,
        FilterExpression: "(attribute_not_exists(#pr) or #pr = :p) and attribute_not_exists(#url)",
        ExpressionAttributeNames: {
            "#pr": "processed",
            "#url": "url"
        },
        ExpressionAttributeValues: {
            ":p": false
        }
    };
    try {
        const albums = await documentClient.scan(params);
        return albums.Items.length ? albums.Items : [];
    } catch (err) {
        console.log('Error in getUnprocessedAlbums function:', err);
        throw err;
    }
}

const processUnprocessedAlbum = async (album, admin) => {
    const newAdmin = await checkAndUpdateTokenIfExpired(admin.user_id, admin);
    if (newAdmin) {
        admin = newAdmin;
    }
    const token = admin.access_token_spotify;
    if (!token) {
        console.log("Error: Token not found");
        return;
    }
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
    await updateAlbumInDynamodb(table, album);
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
        if (cleanedPayload.statusCode !== 200) {
            return null;
        }
        return JSON.parse(cleanedPayload.body);
    } catch (error) {
        console.log('Error invoking Lambda function:', error);
    }
};

const checkAndUpdateTokenIfExpired = async (adminId, admin) => {
    if (!admin) throw new Error("Admin not found");
    const remainingTimeInMinutes = ('expiration_timestamp_spotify' in admin) ?
        (parseFloat(admin.expiration_timestamp_spotify) / 1000 - Date.now() / 1000) / 60 : -1;
    const minutes = parseInt(remainingTimeInMinutes);
    if (minutes <= 15) {
        console.log("getting token...");
        const tokens = await invokeLambda({
            FunctionName: `spotify-scrap-token-${process.env.STAGE}`,
            Payload: JSON.stringify({ "user_id": adminId }),
        });
        if (tokens?.access_token) {
            const admin = await updateUserTokens(admin, tokens);
            return admin;
        }
        return null;
    }
    console.log("Token expires in: ", minutes, " minutes");
    return admin;
}

const updateUserTokens = async (admin, tokens) => {
    console.log(tokens);
    const params = {
        TableName: `regroovio-users-${process.env.STAGE}`,
        Key: { user_id: admin.user_id },
        UpdateExpression: "set access_token_spotify = :at, expiration_timestamp_spotify = :et",
        ExpressionAttributeValues: {
            ":at": tokens.access_token,
            ":et": tokens.expiration_timestamp
        },
    };
    try {
        await documentClient.update(params);
        return { ...admin, ...tokens };
    } catch (err) {
        console.log(`Error updateUserTokens: ${err}`);
        throw err;
    }
};

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
    return targetTrack;
}

const updateAlbumInDynamodb = async (table_name, album) => {
    try {
        const params = {
            TableName: table_name,
            Key: {
                album_id: album.album_id
            },
            UpdateExpression: "set tracks=:t, #pr=:p",
            ExpressionAttributeValues: {
                ':t': album.tracks,
                ':p': 'true'
            },
            ExpressionAttributeNames: {
                "#pr": "processed"
            },
            ReturnValues: "UPDATED_NEW"
        };
        const response = await documentClient.update(params);
        return response;
    } catch (err) {
        console.log(`Error updating album in DynamoDB: ${err}`);
        return null;
    }
}

export { app };
