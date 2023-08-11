// signup/app.mjs

import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const signUp = async (phoneNumber, username) => {
    const secretHash = calculateSecretHash(
        phoneNumber,
        process.env.COGNITO_CLIENT_ID,
        process.env.COGNITO_CLIENT_SECRET
    );
    const userAttributes = [
        {
            Name: "phone_number",
            Value: phoneNumber,
        },
        {
            Name: "preferred_username",
            Value: username,
        }
    ];
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: phoneNumber,
        Password: "dummyPassword#123",
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
    const { phoneNumber, username } = event;
    try {
        const signupData = await signUp(phoneNumber, username);
        if (signupData.$metadata.httpStatusCode !== 200) {
            throw new Error(signupData.message);
        }
        console.log("Signed up:", signupData);
        return { message: "Signed up", signupData, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };