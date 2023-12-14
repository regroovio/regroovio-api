// signup/app.mjs

import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
    const { email, username, password } = event.body ? JSON.parse(event.body) : event;
    try {
        const signupData = await signUp(email, username, password);
        return { message: "Signed up", signupData, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

const signUp = async (email, username, password) => {
    const secretHash = calculateSecretHash(username, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET);
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        SecretHash: secretHash,
        Username: username,
        Password: password,
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
export { app };