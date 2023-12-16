// set-new-password/app.mjs

import { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
    const { email, username, password, code } = event.body ? JSON.parse(event.body) : event;
    try {
        const secretHash = calculateSecretHash(username, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET);
        const params = {
            ClientId: process.env.COGNITO_CLIENT_ID,
            SecretHash: secretHash,
            Username: username,
            Password: password,
            ConfirmationCode: code,
        };
        const response = await client.send(new ConfirmForgotPasswordCommand(params));
        console.log("Code verified for:", email);
        return { message: "Code verified", statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };
