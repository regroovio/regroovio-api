import { CognitoIdentityProviderClient, AdminResetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import loadEnvironmentVariables from "../../../helpers/environment.js";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  await loadEnvironmentVariables();
  try {
    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email
    };
    const response = await client.send(new AdminResetUserPasswordCommand(params));
    return { message: "A password reset code has been sent to your email", data: response, statusCode: 200 };
  } catch (err) {
    console.error(err);
    return { message: err.message, statusCode: 400 };
  }
};

export { requestPasswordReset };