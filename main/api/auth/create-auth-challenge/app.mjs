// create-auth-challenge/app.mjs

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: process.env.REGION });

const app = async (event) => {
    console.log(event);
    console.log(process.env.STAGE);
    console.log(process.env.REGION);
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
        throw err;
    }
};

export { app };
