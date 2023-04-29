// saveCookies.mjs 

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const saveCookies = async (page, user) => {
    try {
        const cookies = await page.cookies();
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.cookies_spotify = cookies;
        await documentClient.put({ TableName: `regroovio-users-${process.env.STAGE}`, Item: user });
    } catch (err) {
        console.error(`Error saveCookies: ${err}`);
        throw err;
    }
};

export { saveCookies };