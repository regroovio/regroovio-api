// saveTokens.mjs 

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const saveTokens = async (user, tokens) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.access_token_spotify = tokens.access_token;
        user.expiration_timestamp_spotify = tokens.expirationTimestamp;
        if (tokens?.refresh_token) {
            user.refresh_token_spotify = tokens.refresh_token;
        }
        await documentClient.put({ TableName: "users", Item: user });
    } catch (err) {
        console.error(`Error saveTokens: ${err}`);
        throw err;
    }
};

export { saveTokens };