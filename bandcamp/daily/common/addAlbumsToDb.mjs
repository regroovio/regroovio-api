// addAlbumsToDb.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { AWS_DYNAMO } from "./config.mjs";
import { createHash } from "crypto";

const dynamoClient = new DynamoDB(AWS_DYNAMO);
const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const invokeLambda = async (params) => {
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Invoking lambda function: ${params.FunctionName}`);
        const command = new InvokeCommand(params);
        const data = await lambdaClient.send(command);
        const rawPayload = new TextDecoder().decode(data.Payload);
        const cleanedPayload = JSON.parse(rawPayload.replace(/^"|"$/g, ''));
        return cleanedPayload.body;
    } catch (error) {
        console.error('Error invoking Lambda function:', error);
    }
};

const addAlbumsToDb = async (table, links) => {
    const chunkSize = 10;
    const itemsAdded = []
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
                const album = { album_id: albumData.album_id.S, url: albumData.url.S };
                const response = await invokeLambda({
                    FunctionName: `regroovio-downloader-${process.env.STAGE}`,
                    Payload: JSON.stringify({ tableName: table, album })
                });
                itemsAdded.push(album);
            } catch (error) {
                if (error.name != "ConditionalCheckFailedException") {
                    console.log(error);
                }
            }
        }));
    }
    return itemsAdded;
};


export { addAlbumsToDb };
