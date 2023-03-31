// addAlbumsToDb.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const dynamoClient = new DynamoDB(AWS_DYNAMO);

const addAlbumsToDb = async (table, links) => {
    let chunkSize = 50;

    if (links.length < 50) {
        chunkSize = links.length;
    }

    for (let i = 0; i < links.length; i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);
        console.log(`Processing chunk ${i / chunkSize + 1} of ${Math.ceil(links.length / chunkSize)}`);

        await Promise.all(chunk.map(async (link) => {
            const id = link?.split("?")[0] ? link.split("?")[0] : link;

            const albumData = {
                id: { S: id },
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
