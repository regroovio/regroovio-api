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

const app = async (event) => {
    const { email, password } = event
    console.log({ email, password });
    try {
        const signupData = await signUp(email, password);
        if (signupData.$metadata.httpStatusCode !== 200) {
            throw new Error(signupData.message);
        }
        console.log("Signed up:", signupData);
        return { message: "Signed up", signupData, statusCode: 400 };
    } catch (err) {
        console.error(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };