// login/app.mjs

import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const formatPhoneNumber = (number) => {
    if (number.startsWith('+')) {
        return number;
    }
    return '+972' + number;
};

const initiateAuth = async (phoneNumber) => {
    const secretHash = calculateSecretHash(
        phoneNumber,
        process.env.COGNITO_CLIENT_ID,
        process.env.COGNITO_CLIENT_SECRET
    );
    const authParams = {
        USERNAME: phoneNumber,
        SECRET_HASH: secretHash,
    };
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthFlow: "CUSTOM_AUTH",
        AuthParameters: authParams,
    };

    const command = new InitiateAuthCommand(params);

    try {
        const response = await client.send(command);
        console.log("Response from Cognito:", response);  // Logging the entire response
        return response;
    } catch (err) {
        console.log("Error from Cognito:", err);  // Logging the error
        throw err;  // Throwing the error instead of returning it
    }
};

const app = async (event) => {
    const { phoneNumber } = event;
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    try {
        const loginData = await initiateAuth(formattedPhoneNumber);
        if (!loginData.$metadata || loginData.$metadata.httpStatusCode !== 200) {
            throw new Error(loginData.message || 'Unexpected response format from Cognito');
        }
        console.log("Authentication started:", loginData);
        return { message: "Authentication started", data: loginData, statusCode: 200 };
    } catch (err) {
        console.log("Error in app function:", err);  // Logging the error in the app function
        return { message: err.message, statusCode: 400 };
    }
};

export { app };