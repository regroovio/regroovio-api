// saveTokens.mjs 

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const saveTokens = async (user, tokens) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));
        user.spotify_access_token = tokens.access_token;
        if (tokens?.expirationTimestamp) {
            user.spotify_expiration_timestamp = tokens.expirationTimestamp;
        }
        if (tokens?.refresh_token) {
            user.spotify_refresh_token = tokens.refresh_token;
        }
        await documentClient.put({ TableName: "users", Item: user });
    } catch (err) {
        console.error(`Error saveTokens: ${err}`);
        throw err;
    }
};

export { saveTokens };