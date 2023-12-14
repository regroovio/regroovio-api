// login/app.mjs

import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const app = async (event) => {
    console.log(event);
    const { email, password } = event.body ? JSON.parse(event.body) : event;
    const secretHash = calculateSecretHash(
        email,
        process.env.COGNITO_CLIENT_ID,
        process.env.COGNITO_CLIENT_SECRET
    );
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
            SECRET_HASH: secretHash
        },
    };
    const command = new InitiateAuthCommand(params);
    try {
        const loginData = await client.send(command);
        const userId = await getUserIdFromDB(email);
        return {
            message: "Logged in",
            data: {
                ...loginData,
                user_id: userId
            },
            statusCode: 200
        };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

const getUserIdFromDB = async (email) => {
    const params = {
        TableName: `regroovio-users-${process.env.STAGE}`,
        FilterExpression: "email = :emailValue",
        ExpressionAttributeValues: {
            ":emailValue": email
        }
    };

    try {
        const result = await documentClient.scan(params);
        if (result.Items && result.Items.length > 0) {
            return result.Items[0].user_id;
        } else {
            console.error("User not found in DynamoDB for email:", email);
            return null;
        }
    } catch (error) {
        console.error('Error fetching user_id from DynamoDB: ', error);
        throw error;
    }
};

export { app };
