// processor/app.mjs

import dotenv from 'dotenv';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getUserById } from './common/getUserById.mjs';
import { AWS_DYNAMO } from './common/config.mjs';
import { slackBot } from './common/slackBot.mjs';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const s3 = new S3Client({ region: 'us-east-1' });;
const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const documentClient = DynamoDBDocument.from(new DynamoDB({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
}));

const app = async (event, context) => {
    const { table } = event
    try {
        console.log(`Getting ${table}...`);
        const bandcampTables = await listBandcampTables(table);
        for (const tableName of bandcampTables) {

            console.log(`Retrieving unsaved albums from ${tableName}`);
            let unsavedAlbums = await fetchUnsavedAlbums(tableName);
            if (!unsavedAlbums?.length) { console.log({ message: 'No unsaved albums found.' }) }
            console.log(`Found ${unsavedAlbums.length} unsaved albums.`);
            await invokeLambdasInChunks(`bandcamp-worker-downloader-${process.env.STAGE}`, unsavedAlbums, tableName);

            console.log(`Retrieving unprocessed albums from ${tableName}`);
            let unprocessedAlbums = await fetchUnprocessedAlbums(tableName);
            if (!unprocessedAlbums?.length) {
                console.log({ message: 'No unprocessed albums found.' });
                return
            }
            const admin_id = process.env.ADMIN_ID;
            let admin = await getUserById(admin_id);
            if (!admin) {
                console.error('User not found');
                return;
            }
            let token = admin.access_token_spotify || null;
            const remainingTimeInMinutes = (admin.expiration_timestamp_spotify - Date.now()) / 1000 / 60;
            const minutes = remainingTimeInMinutes.toFixed(0)
            console.log(minutes == 'NaN' ? 'Token is expired' : `Token expires in: ${minutes} minutes`);
            if (remainingTimeInMinutes <= 15 || minutes == 'NaN') {
                console.log('refreshing token...');
                const rawTokens = await invokeLambda({
                    FunctionName: `spotify-token-${process.env.STAGE}`,
                    Payload: JSON.stringify({ user_id: admin_id })
                });
                const tokens = JSON.parse(rawTokens);
                await updateUserTokens(admin, tokens);
                token = tokens.access_token;
            }

            console.log(`Found ${unprocessedAlbums.length} unprocessed albums.`);
            const foundTracks = []
            const recognizeTracks = []

            let i = 0;
            for (const album of unprocessedAlbums) {
                console.log(`Searching ${i + 1} of ${unprocessedAlbums.length}`);
                for (const track of album.tracks) {
                    const params = {
                        Bucket: 'albums-regroovio',
                        Key: track.key,
                    };
                    const command = new GetObjectCommand(params);
                    const sourceTrackUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 60 });
                    track.release_year = album.release_date?.split(' ')[2] || null;
                    track.sourceTrackUrl = sourceTrackUrl;
                    const targetTrack = await invokeLambda({
                        FunctionName: `spotify-search-track-${process.env.STAGE}`,
                        Payload: JSON.stringify({
                            token,
                            trackName: track.name,
                            albumName: track.album,
                            artistName: album.artist_name,
                            year: track.release_year,
                        })
                    });
                    const parsedTargetTrack = JSON.parse(targetTrack);
                    if (parsedTargetTrack.statusCode === 404) {
                        console.log(`Track not found: ${track.name} | ${track.album} by ${album.artist_name}`);
                        recognizeTracks.push(track);
                    } else {
                        delete parsedTargetTrack.body.available_markets
                        delete parsedTargetTrack.body.disc_number
                        delete parsedTargetTrack.body.explicit
                        delete parsedTargetTrack.body.external_urls
                        delete parsedTargetTrack.body.is_local
                        delete parsedTargetTrack.body.duration_ms
                        delete parsedTargetTrack.body.track_number
                        const targetTrack = parsedTargetTrack.body

                        const score = await invokeLambda({
                            FunctionName: `spotify-compare-tracks-${process.env.STAGE}`,
                            Payload: JSON.stringify({ sourceTrack: track.sourceTrackUrl, targetTrack: targetTrack.preview_url })
                        });
                        if (score < 0.8) {
                            console.log(``);
                            console.log({ score });
                            console.log({ target: { name: targetTrack.name, track: track.sourceTrackUrl } });
                            console.log({ source: { name: track.name, track: targetTrack.preview_url } });
                            console.log(``);
                            continue
                        }
                        foundTracks.push({ targetTrack: parsedTargetTrack, sourceTrack: track });
                    }

                }
                i++;
            }
            console.log(foundTracks);
            // for (let i = 0; i < unprocessedAlbums.length; i++) {
            //     console.log(`Processing ${i + 1} of ${unprocessedAlbums.length}`);
            //     await invokeLambda({
            //         FunctionName: `bandcamp-worker-processor-${process.env.STAGE}`,
            //         Payload: JSON.stringify({ tableName, album: unprocessedAlbums[i], token })
            //     });
            // }
        }
        const response = { functionName: `bandcamp-cron-processor-${process.env.STAGE}`, message: `Success. Table ${table} saved.` }
        await slackBot(response);
        return response;
    } catch (error) {
        const response = { functionName: table, message: error.message }
        await slackBot(response);
        throw new Error(`Failed to process albums: ${error}`);
    }
};

const listBandcampTables = async (table) => {
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
            bandcampTables.push(...result.TableNames.filter(name => name.includes(table)));
            params.ExclusiveStartTableName = result.LastEvaluatedTableName;
        } while (result.LastEvaluatedTableName);

        return bandcampTables;
    } catch (err) {
        console.error(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
};

const invokeLambdasInChunks = async (functionName, albums, tableName, token) => {
    let chunkSize = 10;

    if (albums.length < chunkSize) {
        chunkSize = albums.length;
    }

    for (let i = 0; i < albums.length; i += chunkSize) {
        const chunk = albums.slice(i, i + chunkSize);
        console.log(`Downloading chunk ${i / chunkSize + 1} of ${Math.ceil(albums.length / chunkSize)}`);

        await Promise.all(chunk.map(async (album) => {
            await invokeLambda({
                FunctionName: functionName,
                Payload: JSON.stringify({ tableName, album, token: token ? token : null })
            });
        }));
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
        console.error('Error invoking Lambda function:', error);
    }
};

const fetchUnsavedAlbums = async (tableName) => {
    try {
        const params = { TableName: tableName, Limit: 100 };
        let result;
        const items = [];
        do {
            result = await documentClient.scan(params);
            items.push(...result.Items);
            params.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (result.LastEvaluatedKey);
        const unsavedAlbums = items.filter(album => !album.saved);
        return unsavedAlbums;
    } catch (err) {
        console.error(`Error fetching unsaved albums: ${err}`);
        return [];
    }
};

const fetchUnprocessedAlbums = async (tableName) => {
    try {
        const params = { TableName: tableName, Limit: 100 };
        let result;
        const items = [];
        do {
            result = await documentClient.scan(params);
            items.push(...result.Items);
            params.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (result.LastEvaluatedKey);
        const unprocessedAlbums = items.filter(album => album.saved && !album.processed);
        return unprocessedAlbums;
    } catch (err) {
        console.error(`Error fetching unprocessed albums: ${err}`);
        return [];
    }
};

const updateUserTokens = async (user, tokens) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.access_token_spotify = tokens.access_token;
        user.expiration_timestamp_spotify = tokens.expiration_timestamp;
        if (tokens?.refresh_token) {
            user.refresh_token_spotify = tokens.refresh_token;
        }
        await documentClient.put({ TableName: `users-${process.env.STAGE}`, Item: user });
    } catch (err) {
        console.error(`Error updateUserTokens: ${err}`);
        throw err;
    }
};

export { app }
