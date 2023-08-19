// set-new-password/app.mjs

import { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
    const { email, newPassword } = event.body ? JSON.parse(event.body) : event;
    try {
        const params = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: email,
            Password: newPassword,
            Permanent: true
        };

        const response = await client.send(new AdminSetUserPasswordCommand(params));
        console.log("Password updated for:", email);
        return { message: "Password updated successfully", statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { message: err.message, statusCode: 400 };
    }
};

export { app };
