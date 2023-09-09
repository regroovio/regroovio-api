// resend-email-code/app.mjs

import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const resendConfirmationCode = async (email) => {
    const secretHash = calculateSecretHash(
        email,
        process.env.COGNITO_CLIENT_ID,
        process.env.COGNITO_CLIENT_SECRET
    );

    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        SecretHash: secretHash
    };

    const command = new ResendConfirmationCodeCommand(params);
    return await client.send(command);
};

const app = async (event) => {
    console.log(event);
    const { email } = event.body ? JSON.parse(event.body) : event;
    try {
        const resendData = await resendConfirmationCode(email);
        return { message: "Confirmation code resent", resendData, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };
