// confirm/app.mjs

import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const confirmSignUp = async (phoneNumber, confirmationCode) => {
    const secretHash = calculateSecretHash(
        phoneNumber,
        process.env.COGNITO_CLIENT_ID,
        process.env.COGNITO_CLIENT_SECRET
    );
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        ConfirmationCode: confirmationCode,
        Username: phoneNumber,
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
    const { phoneNumber, confirmationCode } = event;
    try {
        const confirmData = await confirmSignUp(phoneNumber, confirmationCode);
        if (confirmData.$metadata.httpStatusCode !== 200) {
            throw new Error(confirmData.message);
        }
        console.log("Confirmed sign up:", confirmData);
        return { message: "Confirmed", data: confirmData, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };
