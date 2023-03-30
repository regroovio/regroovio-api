// saveCookies.mjs 

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const saveCookies = async (page, user) => {
    try {
        const cookies = await page.cookies();
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.spotify_cookies = cookies;
        await documentClient.put({ TableName: "users", Item: user });
    } catch (err) {
        console.error(`Error saveCookies: ${err}`);
        throw err;
    }
};

export { saveCookies };