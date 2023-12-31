import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "../../../helpers/secretHash.mjs";
import loadEnvironmentVariables from "../../../helpers/environment.js";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const resendConfirmationCode = async (req, res) => {
  const { email } = req.body;
  await loadEnvironmentVariables();
  try {
    const secretHash = calculateSecretHash(email, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET);
    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      SecretHash: secretHash
    };
    const command = new ResendConfirmationCodeCommand(params);
    const resendData = await client.send(command);
    return { message: "Confirmation code resent", resendData, statusCode: 200 };
  } catch (err) {
    console.error(err);
    return { message: err.message, statusCode: 400 };
  }
};

export { resendConfirmationCode };
