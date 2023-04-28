// addAlbumsToDb.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const dynamoClient = new DynamoDB(AWS_DYNAMO);

const addAlbumsToDb = async (table, links) => {
    const chunkSize = links.length;
    for (let i = 0; i < links.length; i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);
        console.log(`Uploading`);

        await Promise.all(chunk.map(async (link) => {
            let album_id = link?.split("?")[0] ? link.split("?")[0] : link;
            album_id = Buffer.from(album_id).toString("base64");
            albumData.url = album_id

            const albumData = {
                album_id: { S: album_id },
            };

            const params = {
                TableName: table,
                Item: albumData,
            };

            try {
                await dynamoClient.putItem(params);
            } catch (error) {
                console.log(error);
            }
        }));
    }
};

export { addAlbumsToDb };
