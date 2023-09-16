// signup/app.mjs

import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const signUp = async (email, username, password) => {
    console.log(
        {
            email,
            COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
            COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET
        }
    );
    const secretHash = calculateSecretHash(
        email,
        process.env.COGNITO_CLIENT_ID,
        process.env.COGNITO_CLIENT_SECRET
    );

    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: username,
        Password: password,
        SecretHash: secretHash,
        UserAttributes: [
            {
                Name: "email",
                Value: email,
            },
            {
                Name: "preferred_username",
                Value: username,
            }
        ],
    };

    const command = new SignUpCommand(params);
    return await client.send(command);
};

const app = async (event) => {
    console.log(event);
    const { email, username, password } = event.body ? JSON.parse(event.body) : event;
    try {
        const signupData = await signUp(email, username, password);
        return { message: "Signed up", signupData, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };