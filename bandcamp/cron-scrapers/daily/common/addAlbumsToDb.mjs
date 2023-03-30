// addAlbumsToDb.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const dynamoClient = new DynamoDB(AWS_DYNAMO);

const addAlbumsToDb = async (table, links) => {
    for (const link of links) {
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
    }
};

export { addAlbumsToDb };
