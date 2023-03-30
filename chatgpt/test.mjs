import { config } from "dotenv";
import { Configuration, OpenAIApi } from "openai";

config();

const openAi = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPEN_AI_API_KEY,
    })
);

const liked_songs = [
    {
        name: "Smells Like Teen Spirit",
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
    },
    {
        name: "Come As You Are",
        genre: "pop",
        mood: "Energetic",
        timePeriod: "2020s",
        language: "Spanish",
        instrumentation: "instruments",
        artist: "Foo",
        volume: "medium",
        bpm: "slow",
    },
];

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

async function predictSongLikelihood(likedSongs, newSong) {
    const systemPrompt = `Given the following liked songs of a user:\n\n${likedSongs.map(song => JSON.stringify(song, null, 2)).join("\n\n")}\n\nPredict the likelihood the user will like this new song:\n\n${JSON.stringify(newSong, null, 2)}\n\nLikelihood (1 to 10): `;
    const messages = [{ role: "system", content: systemPrompt }];

    const response = await openAi.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
    });
    const likelihood = parseFloat(response.data.choices[0].message.content.trim());
    return likelihood;
}

async function getRecommendation() {
    const likelihood = await predictSongLikelihood(liked_songs, new_song);
    return { song: new_song.name, likelihood: likelihood };
}

getRecommendation()
    .then((recommendation) => {
        console.log(recommendation);
    })
    .catch((error) => {
        console.error("Error:", error);
    });
