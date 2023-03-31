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

    let token = user.spotify_access_token || null;
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

    const tracks = await fetchTracks(token);
    for (const track of tracks) {
        const trackWithFeatures = await enrichTrackWithFeatures(track, token);
        enrichTrackInfo(trackWithFeatures, track)
        await saveTracksWithFeatures(user, trackWithFeatures);
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

const enrichTrackInfo = (trackWithFeatures, track) => {
    if (trackWithFeatures) {
        trackWithFeatures.popularity = track.popularity;
        trackWithFeatures.release_date = track.album.release_date;
        trackWithFeatures.artists = track.album.artists;
        trackWithFeatures.album = track.album.name;
        trackWithFeatures.name = track.name;
        delete trackWithFeatures.type;
        delete trackWithFeatures.track_href;
        delete trackWithFeatures.analysis_url;
    } else {
        console.error("trackWithFeatures is undefined");
    }
};

const enrichTrackWithFeatures = async (track, token) => {
    const trackWithFeatures = JSON.parse(await invokeLambda({
        FunctionName: `spotify-get-audio-features-${process.env.STAGE}`,
        Payload: JSON.stringify({ token, id: track.id })
    })).body;
    return trackWithFeatures;
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
        user.spotify_access_token = tokens.access_token;
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