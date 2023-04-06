// confirm/app.mjs

import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { AWS_COGNITO } from "./common/config.mjs";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

const confirmSignUp = async (email, confirmationCode) => {
    const secretHash = calculateSecretHash(
        email,
        AWS_COGNITO.ClientId,
        AWS_COGNITO.ClientSecret
    );
    const params = {
        ClientId: AWS_COGNITO.ClientId,
        ConfirmationCode: confirmationCode,
        Username: email,
        SecretHash: secretHash,
    };

    const command = new ConfirmSignUpCommand(params);

    try {
        return await client.send(command);
    } catch (err) {
        return err;
    }
};

const app = async (event) => {
    const { email, confirmationCode } = event
    try {
        const confirmData = await confirmSignUp(email, confirmationCode);
        if (confirmData.$metadata.httpStatusCode !== 200) {
            throw new Error(confirmData.message);
        }
        console.log("Confirmed sign up:", confirmData);
        return { message: "Confirmed", data: confirmData };
    } catch (err) {
        console.error(err);
        return { message: err.message };
    }
};

export { app };
