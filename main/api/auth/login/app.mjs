// login/app.mjs

import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";
import { AWS_COGNITO } from "./common/config.mjs";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

const initiateAuth = async (email, password) => {
    const secretHash = calculateSecretHash(
        email,
        AWS_COGNITO.ClientId,
        AWS_COGNITO.ClientSecret
    );
    const authParams = {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash,
    };
    const params = {
        ClientId: AWS_COGNITO.ClientId,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: authParams,
    };

    const command = new InitiateAuthCommand(params);

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
        const authData = await initiateAuth(email, password);
        if (authData.$metadata.httpStatusCode !== 200) {
            throw new Error(authData.message);
        }
        console.log("Authenticated user:", authData);
        return { message: "Authenticated", data: authData };
    } catch (err) {
        console.error(err);
        return { message: err.message };
    }
};

export { app };



