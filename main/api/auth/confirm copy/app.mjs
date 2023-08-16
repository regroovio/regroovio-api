// reset/app.mjs

import { CognitoIdentityProviderClient, AdminResetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
    console.log(event);
    const { email } = JSON.parse(event.body) || event;
    try {
        const params = {
            UserPoolId: process.env.COGNITO_CLIENT_ID,
            Username: email
        };

        const response = await client.send(new AdminResetUserPasswordCommand(params));
        console.log("Password reset for:", email);
        return { message: "Password reset successful", data: response, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };