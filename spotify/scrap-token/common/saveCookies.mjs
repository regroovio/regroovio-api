// saveCookies.mjs 

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const saveCookies = async (page, user) => {
    try {
        const cookies = await page.cookies();
        const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));
        user.cookies_spotify = cookies;
        await documentClient.put({ TableName: `regroovio-users-${process.env.STAGE}`, Item: user });
    } catch (err) {
        console.log(`Error saveCookies: ${err}`);
        throw err;
    }
};

export { saveCookies };