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

const app = async (event) => {
    const { email, password } = event
    try {
        const loginData = await initiateAuth(email, password);
        if (loginData.$metadata.httpStatusCode !== 200) {
            throw new Error(loginData.message);
        }
        console.log("Authenticated user:", loginData);
        return { message: "Authenticated", data: loginData, statusCode: 200 };
    } catch (err) {
        console.error(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };



