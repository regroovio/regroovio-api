// create-auth-challenge/app.mjs

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: process.env.REGION });

const app = async (event) => {
    try {
        const secretLoginCode = Math.floor(Math.random() * (9999 - 1000) + 1000);
        const phoneNumber = event.request.userAttributes.phone_number;

        await snsClient.send(new PublishCommand({
            Message: `Your verification code is ${secretLoginCode}`,
            PhoneNumber: phoneNumber
        }));

        event.response.publicChallengeParameters = { phoneNumber };
        event.response.privateChallengeParameters = { secretLoginCode: `${secretLoginCode}` };
        event.response.challengeMetadata = 'PASSWORDLESS_CHALLENGE';

        return event;
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };
