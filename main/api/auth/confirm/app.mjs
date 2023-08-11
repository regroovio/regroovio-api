// confirm/app.mjs

import { CognitoIdentityProviderClient, RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "./common/secretHash.mjs";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const formatPhoneNumber = (number) => {
    if (number.startsWith('+')) {
        return number;
    }
    return '+972' + number;
};

const app = async (event) => {
    const { phoneNumber, challengeAnswer } = event;
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

    const secretHash = calculateSecretHash(
        formattedPhoneNumber,
        process.env.COGNITO_CLIENT_ID,
        process.env.COGNITO_CLIENT_SECRET
    );

    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        ChallengeName: "CUSTOM_CHALLENGE",
        Session: event.session, // assuming the session token is passed from the client
        ChallengeResponses: {
            "USERNAME": formattedPhoneNumber,
            "SECRET_HASH": secretHash,
            "ANSWER": challengeAnswer
        }
    };

    const command = new RespondToAuthChallengeCommand(params);

    try {
        const response = await client.send(command);
        return { message: "Authentication successful", data: response, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };