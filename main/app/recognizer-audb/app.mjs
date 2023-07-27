// app.mjs

import axios from 'axios';
import { slackBot } from './common/slackBot.mjs';
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDB({ region: process.env.REGION });
const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

class CustomError extends Error {
    constructor(message, functionName, additionalInfo) {
        super(message);
        this.functionName = functionName;
        this.additionalInfo = additionalInfo;
    }
}

const app = async () => {
    try {
        const tables = await list_tables()
        for (const table of tables) {
            const albums = await processProcessedAlbums(table)
            if (albums.length === 0) {
                console.log(`No processed albums found in ${table}`);
                continue;
            }
            console.log(`Found ${albums.length} processed albums in ${table}`);
            for (const album of albums) {
                for (const track of album.tracks) {
                    if (!track.spotify) {
                        console.log('Getting track info', track.name);

                        // const trackInfo = await getTrackInfo(track.url);
                        // const trackResult = trackInfo.data.result;

                        // if (trackResult?.spotify) {
                        //     const trackSpotify = trackResult.spotify;
                        //     console.log('Track found', trackSpotify.name);
                        //     track.spotify = trackSpotify;
                        // } else {
                        //     console.log('No track info found for', track.name);
                        //     track.spotify = null;
                        //     await slackBot({
                        //         message: `No track info found for ${track.name}`,
                        //         functionName: `regroovio-recognizer-${process.env.STAGE}`,
                        //         additionalInfo: trackInfo.data || trackInfo.status
                        //     });
                        // }
                    }
                }
            }
        }
        return { body: { message: "Processed all albums" } };
    } catch (err) {
        console.log('Error:', err.message);
        await slackBot({
            message: err.message,
            functionName: `regroovio-recognizer-${process.env.STAGE}`,
            additionalInfo: err
        });
        return { message: 'Failed', err };
    }
};

const getTrackInfo = async (track) => {
    if (!track || !process.env.AUDD_API_KEY) {
        console.log("getTrackInfo: Invalid parameters");
        return null;
    }

    try {
        console.log('fetching from audd.io: ', track);
        const response = await axios.post('https://api.audd.io/', {
            url: track,
            return: 'apple_music,spotify',
            api_token: process.env.AUDD_API_KEY,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return response;
    } catch (error) {
        console.log(error);
        throw new CustomError(error.message, 'getTrackInfo');
    }
};

const list_tables = async () => {
    const data = await dynamoClient.listTables({});
    const tables = data.TableNames.filter((table) => {
        return !table.includes("regroovio-users") && table.includes(process.env.STAGE);
    });
    return tables;
}

const processProcessedAlbums = async (table) => {
    console.log(`Processing table: ${table}`);
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
    const response = await documentClient.scan(params);
    return response.Items;
}

export { app };
