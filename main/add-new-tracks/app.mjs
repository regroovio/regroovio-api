import { config } from "dotenv";
import { getUserById } from "./common/getUserById.mjs";
import { Configuration, OpenAIApi } from "openai";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { AWS_DYNAMO } from "./common/config.mjs";
config();

const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));

const openAi = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPEN_AI_API_KEY,
    })
);

const app = async (event) => {
    const { user_id } = event;
    const user = await getUserById(user_id);

    if (!user) {
        throw new Error(`User not found with id ${user_id}`);
    }

    const albums = await getTableItems("bandcamp-collection-dev");
    const new_tracks = extractNewTracks(albums);
    const liked_tracks = extractLikedTracks(user.liked_tracks);
    // const limited_liked_tracks = liked_tracks.slice(0, 29);

    const response = await getRecommendation(new_tracks[0], liked_tracks);
    return response;
};

const extractNewTracks = (albums) => {
    const new_tracks = [];

    for (const album of albums) {
        if (!album?.processed) continue;

        for (const track of album.tracks) {
            if (!track.spotify?.id) continue;

            const { id: track_id, uri: track_uri, name: track_name, ...track_params } = track.spotify;
            delete track_params.artists;
            delete track_params.album;
            delete track_params.name;
            delete track_params.key_words;
            delete track_params.track_href;
            delete track_params.analysis_url;
            delete track_params.type;
            delete track_params.time_signature;
            delete track_params.duration_ms;
            new_tracks.push({ track_id, track_uri, track_name, track_params });
        }
    }

    return new_tracks;
};

const extractLikedTracks = (likedTracks) => {
    return likedTracks.map((track) => {
        const { analysis_url, track_href, type, id, uri, ...liked_track } = track;
        delete liked_track.artists;
        delete liked_track.album;
        delete liked_track.name;
        delete liked_track.key_words;
        delete liked_track.track_href;
        delete liked_track.analysis_url;
        delete liked_track.type;
        delete liked_track.time_signature;
        delete liked_track.duration_ms;
        return liked_track;
    });
};

const getRecommendation = async (new_track, liked_tracks) => {
    const likelihood = await predictSongLikelihood(liked_tracks, new_track.track_params);
    return { track: new_track, likelihood: likelihood };
};

const predictSongLikelihood = async (likedSongs, newSong) => {

    const systemPrompt = generateSystemPrompt(likedSongs, newSong);

    const messages = [{ role: "system", content: systemPrompt }];
    try {
        const response = await openAi.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
        });

        console.log("API Response:", response.data.choices[0].message.content);
        const likelihood = parseFloat(response.data.choices[0].message.content);
        return likelihood;
    } catch (error) {
        console.error("Error:", error.message);
        return -1
    }
}

const generateSystemPrompt = (likedSongs, newSong) => {
    // shorten the prompt if it's too long. max token allowed by openai is 4096 tokens

    return `Given the following liked songs of a user and their features:\n\n${likedSongs.map(song => JSON.stringify(song, null, 2)).join("\n\n")}\n\nAnalyze the features of this new song:\n\n${JSON.stringify(newSong, null, 2)}\n\nConsidering the similarities and differences in features like tempo, energy, danceability, valence, and others, directly provide a numerical prediction (on a scale of 1 to 10) of the likelihood that the user will like this new song, without any explanation or additional context:`;
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
        return items;
    } catch (err) {
        console.error(`Error fetching items: ${err}`);
        return [];
    }
};

export { app };