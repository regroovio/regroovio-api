// login/app.mjs

import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

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
        return { message: "Logged in", data: loginData, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };
