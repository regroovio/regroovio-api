// config.mjs

import { setEnvironmentVariables } from "./setEnvironmentVariables.mjs";
import dotenv from "dotenv";
dotenv.config();
await setEnvironmentVariables();

export const AWS_DYNAMO = {
    region: process.env.REGION
};

export const DAILY = {
    SELECTOR: `.item-title a`,
};