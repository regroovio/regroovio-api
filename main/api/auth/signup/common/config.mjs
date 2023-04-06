// config.mjs

import { setEnvironmentVariables } from "./setEnvironmentVariables.mjs";
import dotenv from "dotenv";
dotenv.config();
await setEnvironmentVariables();

export const AWS_COGNITO = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    ClientId: process.env.COGNITO_CLIENT_ID,
    ClientSecret: process.env.COGNITO_CLIENT_SECRET,
};