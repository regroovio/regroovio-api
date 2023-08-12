// validateToken/app.mjs

import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
    const { Authorization } = event.headers || event;
    if (!Authorization) {
        return { isValid: false, message: "No token provided.", statusCode: 400 };
    }
    const token = Authorization.replace("Bearer ", "");
    const params = {
        AccessToken: token
    };
    const command = new GetUserCommand(params);

    try {
        const response = await client.send(command);
        return { isValid: true, data: response, statusCode: 200 };
    } catch (err) {
        console.log(err);
        return { isValid: false, message: err.message, statusCode: 400 };
    }
};

export { app };
