// app.mjs

import { config } from "dotenv";
import { getUserById } from "./common/getUserById.mjs";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { AWS_DYNAMO } from "./common/config.mjs";
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';

config();

const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));

const app = async (event) => {
    const tables = await listBandcampTables()

    const { user_id, section } = event;
    const user = await getUserById(user_id);
    if (!user) throw new Error(`User not found with id ${user_id}`);

    for (const table of tables) {
        const albums = await getTableItems(table);
        for (const album of albums) {
            const newTracksToAdd = album.tracks
            const usersLikedTracks = user.liked_tracks
            console.log({ newTracksToAdd, usersLikedTracks });
            return
            const currentPath = fileURLToPath(import.meta.url);
            const csvFilePath = path.resolve(path.dirname(currentPath), 'data/data.csv');
            saveDataToCSV(usersLikedTracks, newTracksToAdd, csvFilePath);
        }
    }
};

const saveDataToCSV = (likedTracks, newTracks, filePath) => {
    const header = [
        'name',
        'loudness',
        'liveness',
        'tempo',
        'valence',
        'instrumentalness',
        'danceability',
        'speechiness',
        'mode',
        'duration_ms',
        'acousticness',
        'key',
        'energy',
        'time_signature',
        'label'
    ];

    const data = [];

    likedTracks.forEach(track => {
        data.push([
            track.name,
            track.loudness,
            track.liveness,
            track.tempo,
            track.valence,
            track.instrumentalness,
            track.danceability,
            track.speechiness,
            track.mode,
            track.duration_ms,
            track.acousticness,
            track.key,
            track.energy,
            track.time_signature,
            'liked'
        ]);
    });

    newTracks.forEach(track => {
        data.push([
            track.name,
            track.loudness,
            track.liveness,
            track.tempo,
            track.valence,
            track.instrumentalness,
            track.danceability,
            track.speechiness,
            track.mode,
            track.duration_ms,
            track.acousticness,
            track.key,
            track.energy,
            track.time_signature,
            'not_listened'
        ]);
    });

    const csvContent = [header, ...data].map(row => row.join(',')).join('\n');
    fs.writeFileSync(filePath, csvContent);
};

const listBandcampTables = async () => {
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
            bandcampTables.push(...result.TableNames.filter(name => name.includes('bandcamp') && name.includes(process.env.STAGE)));
            params.ExclusiveStartTableName = result.LastEvaluatedTableName;
        } while (result.LastEvaluatedTableName);

        return bandcampTables;
    } catch (err) {
        console.error(`Error listing Bandcamp tables: ${err}`);
        return [];
    }
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
