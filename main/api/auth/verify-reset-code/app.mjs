// verify-code/app.mjs

import { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
    const { email, code } = event.body ? JSON.parse(event.body) : event;
    try {
        const params = {
            ClientId: process.env.COGNITO_CLIENT_ID,
            ConfirmationCode: code,
            Username: email
        };

        const response = await client.send(new ConfirmForgotPasswordCommand(params));
        console.log("Code verified for:", email);
        return { message: "Code verified", statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };
