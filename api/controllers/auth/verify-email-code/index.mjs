import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "../../../helpers/secretHash.mjs";
import loadEnvironmentVariables from "../../../helpers/environment.js";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const verifyEmailCode = async (req, res) => {
  const { username, confirmationCode } = req.body;
  await loadEnvironmentVariables();
  const secretHash = calculateSecretHash(
    username,
    process.env.COGNITO_CLIENT_ID,
    process.env.COGNITO_CLIENT_SECRET
  );
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: username,
    ConfirmationCode: confirmationCode,
    SecretHash: secretHash,
  };
  const command = new ConfirmSignUpCommand(params);
  try {
    const response = await client.send(command);
    return { message: "Email confirmed", data: response, statusCode: 200 };
  } catch (err) {
    console.error(err);
    return { message: err.message, statusCode: 400 };
  }
};

export { verifyEmailCode };