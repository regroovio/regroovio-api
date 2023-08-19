// request-new-password/app.mjs

import { CognitoIdentityProviderClient, AdminResetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
    console.log(event);
    const { email } = event.body ? JSON.parse(event.body) : event;
    try {
        const params = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: email
        };

        const response = await client.send(new AdminResetUserPasswordCommand(params));
        console.log("Password reset for:", email);
        return { message: "A password reset code has been sent to your email", data: response, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };