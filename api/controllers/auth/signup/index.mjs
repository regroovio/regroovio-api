import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import calculateSecretHash from "../../../helpers/secretHash.mjs";
import loadEnvironmentVariables from "../../../helpers/environment.js";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

const signUp = async (req, res) => {
  const { email, username, password } = req.body;
  await loadEnvironmentVariables();
  try {
    const secretHash = calculateSecretHash(username, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET);
    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      SecretHash: secretHash,
      Username: username,
      Password: password,
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
        {
          Name: "preferred_username",
          Value: username,
        }
      ],
    };
    const command = new SignUpCommand(params);
    const signupData = await client.send(command);
    return { message: "Signed up", signupData, statusCode: 200 };
  } catch (err) {
    console.log(err);
    return { message: err.message, statusCode: 400 };
  }
};

export { signUp };