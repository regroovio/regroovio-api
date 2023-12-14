// verify-email-code/app.mjs

import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
    const { username, confirmationCode } = event.body ? JSON.parse(event.body) : event;
    const secretHash = calculateSecretHash(
        username,
        process.env.COGNITO_CLIENT_ID,
        process.env.COGNITO_CLIENT_SECRET
    );
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: username,
        ConfirmationCode: confirmationCode,
        SecretHash: secretHash,
    };
    const command = new ConfirmSignUpCommand(params);
    try {
        const response = await client.send(command);
        return { message: "Email confirmed", data: response, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };