// login/app.mjs

import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

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
        return await client.send(command);
    } catch (err) {
        return err;
    }
};

const app = async (event) => {
    const { phoneNumber } = event;
    try {
        const loginData = await initiateAuth(phoneNumber);
        if (loginData.$metadata.httpStatusCode !== 200) {
            throw new Error(loginData.message);
        }

        console.log("Authentication started:", loginData);
        return { message: "Authentication started", data: loginData, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };
