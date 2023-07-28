// addAlbumsToQueue.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { SQS } from "@aws-sdk/client-sqs";
import { createHash } from "crypto";

const dynamoClient = new DynamoDB({ region: process.env.REGION });
const sqs = new SQS({ region: process.env.REGION });

const addAlbumsToQueue = async (table, links) => {
    const itemsAdded = []
    await Promise.all(links.map(async (link) => {
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
            const album = { album_id: albumData.album_id.S, url: albumData.url.S, table: table };
            itemsAdded.push(album);

            await sqs.sendMessage({
                QueueUrl: process.env.SQS_QUEUE_DOWNLOAD,
                MessageBody: JSON.stringify(album)
            });

        } catch (error) {
            if (error.name != "ConditionalCheckFailedException") {
                console.log(error);
            }
        }
    }));
    return itemsAdded;
};

export { addAlbumsToQueue };