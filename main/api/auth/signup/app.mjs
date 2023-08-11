// signup/app.mjs

import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";
import { randomBytes } from 'crypto';

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const generateUUID = () => {
    return randomBytes(16).toString('hex');
};

const formatPhoneNumber = (number) => {
    if (number.startsWith('+')) {
        return number;
    }
    return '+972' + number;
};

const signUp = async (phoneNumber, username) => {
    const uuid = generateUUID();

    const secretHash = calculateSecretHash(
        uuid,
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
        Username: uuid,
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
    console.log(event);
    const { phoneNumber, username } = event;
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    try {
        const signupData = await signUp(formattedPhoneNumber, username);
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