import { config } from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { AWS_DYNAMO } from "./common/config.mjs";
config();

const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));

const openAi = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPEN_AI_API_KEY,
    })
);


const new_song = {
    name: "weird",
    genre: "Rock",
    mood: "relaxed",
    timePeriod: "1990s",
    language: "English",
    instrumentation: "Guitar, Drums, Bass, Vocals",
    artist: "Nirvana",
    playlist: "90s Rock Classics",
    volume: "Loud",
    bpm: "Fast",
    musicEra: "90s",
};


const app = async () => {
    // const liked_tracks = await getTableItems("users");
    // console.log(liked_tracks);
    const new_tracks = await getTableItems("bandcamp-feed-dev");
    console.log(new_tracks[0]);
    return

    const response = await getRecommendation()
    console.log(response);
};


const predictSongLikelihood = async (likedSongs, newSong) => {
    const systemPrompt = `Given the following liked songs of a user:\n\n${likedSongs.map(song => JSON.stringify(song, null, 2)).join("\n\n")}\n\nPredict the likelihood the user will like this new song:\n\n${JSON.stringify(newSong, null, 2)}\n\nLikelihood (1 to 10): `;
    const messages = [{ role: "system", content: systemPrompt }];

    const response = await openAi.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
    });
    const likelihood = parseFloat(response.data.choices[0].message.content.trim());
    return likelihood;
}

const getRecommendation = async () => {


    const likelihood = await predictSongLikelihood(liked_tracks, new_song);
    return { song: new_song.name, likelihood: likelihood };
}

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

export { app }