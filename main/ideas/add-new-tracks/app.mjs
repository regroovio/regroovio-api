import { getUserById } from "./common/getUserById.mjs";
import { Configuration, OpenAIApi } from "openai";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));
const openAi = new OpenAIApi(new Configuration({ apiKey: process.env.OPEN_AI_API_KEY_V2 }));

const app = async (event) => {
    const { user_id, section } = event;
    const user = await getUserById(user_id);
    if (!user) throw new Error(`User not found with id ${user_id}`);
    console.log(`regroovio-${section}-${process.env.STAGE}`);
    const albums = await getTableItems(`regroovio-${section}-${process.env.STAGE}`);
    const newTracks = extractNewTracks(albums);

    const likedTracks = extractLikedTracks(user.liked_tracks);
    console.log('new tracks to add ', [newTracks[0]]);
    console.log("user's liked track", user.liked_tracks[0]);
    return
    for (const newTrack of newTracks) {
        const score = await getRecommendation(likedTracks, newTrack.track_params);
        console.log({
            album_name: newTrack.album_name,
            track_name: newTrack.track_name,
            track_uri: newTrack.track_uri,
            track_id: newTrack.track_id,
            score
        });
        await delay(15000); // Rate limiting: 1 request per 15 seconds
    }
};

const getRecommendation = async (likedTracks, newTrack) => {
    const likelihood = await predictSongLikelihood(likedTracks, newTrack);
    return likelihood;
};

const predictSongLikelihood = async (likedSongs, newSong) => {
    const prompt = generatePrompt(likedSongs, newSong);
    const messages = [
        { role: "system", content: prompt }
    ];

    try {
        const response = await openAi.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
        });
        console.log("API Response:", response.data.choices[0].message.content);
        const likelihood = parseFloat(response.data.choices[0].message.content);
        return likelihood;
    } catch (error) {
        console.log("Error:", error.message);
    }
    return -1;
};

const delay = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        console.log(`Error fetching items: ${err}`);
        return [];
    }
};

const generatePrompt = (likedSongs, newSong, maxLikedSongs = 38) => {
    const prettyJSON = (obj) => {
        const jsonString = JSON.stringify(obj, null, 2);
        return jsonString.replace(/[",\[\]{}:]/g, "");
    };

    const likedSongsFormatted = likedSongs
        .slice(0, maxLikedSongs)
        .map(song => prettyJSON(song))
        .join(" ");

    const newSongFormatted = prettyJSON(newSong);

    return `
            Given the following liked songs of a user and their features:${likedSongsFormatted}
    
            Analyze the similarities and differences in features like tempo, energy, danceability, valence, and others. Then, provide a numerical prediction ONLY. Your output MUST BE A NUMERICAL VALUE ONLY (on a scale of 1 to 10) of the likelihood that the user will like this new song, without any explanation or additional context.
            
            Here are the features of the new song to be analyzed:\n${newSongFormatted}
            
            The user has a preference for trap music, pop, happy, and popular music.

            if a song has a key word that matchs the genre that the user likes then the song is more likely to be liked

            What is the NUMERICAL likelihood that the user will like this new song?`;
};

const extractNewTracks = (albums) => {
    const newTracks = [];
    for (const album of albums) {
        if (!album?.processed) continue;
        for (const track of album.tracks) {
            if (!track.spotify?.id) continue;
            const { id: track_id, uri: track_uri, name: track_name, ...track_params } = track.spotify;
            const album_name = track_params.album;
            delete track_params.artists;
            delete track_params.album;
            delete track_params.name;
            delete track_params.track_href;
            delete track_params.analysis_url;
            delete track_params.type;
            delete track_params.time_signature;
            delete track_params.duration_ms;
            delete track_params.release_date;
            newTracks.push({ track_id, track_uri, track_name, album_name, track_params });
        }
    }
    return newTracks;
};

const extractLikedTracks = (likedTracks) => {
    return likedTracks.map((track) => {
        const { analysis_url, track_href, type, id, uri, ...liked_track } = track;
        delete liked_track.artists;
        delete liked_track.album;
        delete liked_track.name;
        delete liked_track.track_href;
        delete liked_track.analysis_url;
        delete liked_track.type;
        delete liked_track.time_signature;
        delete liked_track.duration_ms;
        delete liked_track.release_date;
        return liked_track;
    });
};

export { app };
