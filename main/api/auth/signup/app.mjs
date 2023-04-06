// signup/app.mjs

import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";
import { AWS_COGNITO } from "./common/config.mjs";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

const signUp = async (email, password) => {
    const secretHash = calculateSecretHash(
        email,
        AWS_COGNITO.ClientId,
        AWS_COGNITO.ClientSecret
    );
    const userAttributes = [
        {
            Name: "email",
            Value: email,
        },
    ];
    const params = {
        ClientId: AWS_COGNITO.ClientId,
        Password: password,
        Username: email,
        SecretHash: secretHash,
        UserAttributes: userAttributes,
    };

    const command = new SignUpCommand(params);

    try {
        return await client.send(command);
    } catch (err) {
        return err;
    }
};

const app = async () => {
    const email = "nethanielmaoz@gmail.com";
    const password = "testTest!123123";
    try {
        const data = await signUp(email, password);
        if (data.$metadata.httpStatusCode !== 200) {
            throw new Error(data.message);
        }
        console.log("Signed up:", data);
        return { message: "Signed up", data };
    } catch (err) {
        console.error(err);
        return { message: err.message };
    }
};

export { app };