import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const app = async (event) => {
  console.log(event);
  const { token } = event.body ? JSON.parse(event.body) : event;
  if (!token) {
    return { isValid: false, message: "No token provided.", statusCode: 400 };
  }
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
