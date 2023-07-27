// saveTokens.mjs 

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const saveTokens = async (user, tokens) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));
        user.access_token_spotify = tokens.access_token;
        user.expiration_timestamp_spotify = tokens.expiration_timestamp;
        if (tokens?.refresh_token) {
            user.refresh_token_spotify = tokens.refresh_token;
        }
        await documentClient.put({ TableName: `regroovio-users-${process.env.STAGE}`, Item: user });
    } catch (err) {
        console.log(`Error saveTokens: ${err}`);
        throw err;
    }
};

export { saveTokens };