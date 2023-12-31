import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const validateToken = async (req, res) => {
  const { token } = req.body;
  const params = {
    AccessToken: token
  };
  const command = new GetUserCommand(params);
  try {
    const response = await client.send(command);
    return { isValid: true, data: response, statusCode: 200 };
  } catch (err) {
    console.error(err);
    return { isValid: false, message: err.message, statusCode: 400 };
  }
};

export { validateToken };
