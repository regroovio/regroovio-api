// addAlbumsToDb.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";
import { createHash } from "crypto";

const dynamoClient = new DynamoDB(AWS_DYNAMO);

const addAlbumsToDb = async (table, links) => {
    const chunkSize = links.length;
    for (let i = 0; i < links.length; i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);
        console.log(`Uploading`);

        await Promise.all(chunk.map(async (link) => {
            const album_url = link?.split("?")[0] ? link.split("?")[0] : link;
            const album_id = createHash("sha256").update(album_url).digest("hex");

            const albumData = {
                album_id: { S: album_id },
                url: { S: album_url },
            };

            const params = {
                TableName: table,
                Item: albumData,
                ConditionExpression: "attribute_not_exists(album_id)",
            };

            try {
                await dynamoClient.putItem(params);
            } catch (error) {
                if (error.name === "ConditionalCheckFailedException") {
                    console.log(`Item with album_id ${album_id} already exists.`);
                } else {
                    console.log(error);
                }
            }
        }));
    }
};

export { addAlbumsToDb };
