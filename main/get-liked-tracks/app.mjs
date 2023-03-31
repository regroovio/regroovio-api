// app.mjs

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getUserById } from "./common/getUserById.mjs";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./common/config.mjs";

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const app = async () => {
    const user_id = process.env.ADMIN_ID;
    let user = await getUserById(user_id);

    if (!user) {
        console.error('User not found');
        return;
    }

    let token = user.access_token_spotify || null;
    const remainingTimeInMinutes = (user.spotify_expiration_timestamp - Date.now()) / 1000 / 60;
    console.log("Remaining time in minutes:", remainingTimeInMinutes.toFixed(0));

    if (remainingTimeInMinutes <= 15) {
        console.log('Token is expiring soon or already expired, refreshing...');
        const rawTokens = await invokeLambda({
            FunctionName: `spotify-token-${process.env.STAGE}`,
            Payload: JSON.stringify({ user_id: user_id })
        });
        const tokens = JSON.parse(rawTokens);
        await updateUserTokens(user, tokens);
        token = tokens.access_token;
    }

    console.log('getting liked tracks');
    const tracks = await fetchTracks(token);

    if (!tracks?.length) {
        return { message: 'No liked tracks found.' };
    }

    console.log(`Found ${tracks.length} tracks.`);

    const tracksWithFeatures = await enrichTrackWithFeatures(tracks, token);
    await saveTracksWithFeatures(user, tracksWithFeatures);
    return { message: 'All tracks are saved.' };
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

const fetchTracks = async (token) => {
    const rawLikedTracks = await invokeLambda({
        FunctionName: `spotify-get-likes-${process.env.STAGE}`,
        Payload: JSON.stringify({ token, limit: 50, offset: 0 })
    });
    const likedTracks = JSON.parse(rawLikedTracks).body;
    const rawTopTracks = await invokeLambda({
        FunctionName: `spotify-get-top-${process.env.STAGE}`,
        Payload: JSON.stringify({ token, type: 'tracks', time_range: 'medium_term', limit: 50, offset: 0 })
    });
    const topTracks = JSON.parse(rawTopTracks).body;
    return [...likedTracks.map(t => t.track), ...topTracks];
};

const enrichTrackWithFeatures = async (tracks, token) => {
    const chunkSize = 10;
    const trackFeatures = [];

    for (let i = 0; i < tracks.length; i += chunkSize) {
        const chunk = tracks.slice(i, i + chunkSize);
        const promises = chunk.map(track => invokeLambda({
            FunctionName: `spotify-get-audio-features-${process.env.STAGE}`,
            Payload: JSON.stringify({ token, id: track.id })
        }));

        const results = await Promise.all(promises);
        results.forEach(result => {
            const trackWithFeatures = JSON.parse(result).body;
            trackWithFeatures.popularity = tracks[i].popularity;
            trackWithFeatures.release_date = tracks[i].album.release_date;
            trackWithFeatures.artists = tracks[i].album.artists;
            trackWithFeatures.album = tracks[i].album.name;
            trackWithFeatures.name = tracks[i].name;
            delete trackWithFeatures.type;
            delete trackWithFeatures.track_href;
            delete trackWithFeatures.analysis_url;
            trackFeatures.push(trackWithFeatures);
        });
    }

    return trackFeatures;
};


const saveTracksWithFeatures = async (user, tracksWithFeatures) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.liked_tracks = tracksWithFeatures;
        await documentClient.put({ TableName: "users", Item: user });
    } catch (err) {
        console.error(`Error saveTracksWithFeatures: ${err}`);
        throw err;
    }
};

const updateUserTokens = async (user, tokens) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.access_token_spotify = tokens.access_token;
        user.spotify_expiration_timestamp = tokens.expiration_timestamp;
        if (tokens?.refresh_token) {
            user.refresh_token_spotify = tokens.refresh_token;
        }
        await documentClient.put({ TableName: "users", Item: user });
    } catch (err) {
        console.error(`Error updateUserTokens: ${err}`);
        throw err;
    }
};

export { app };