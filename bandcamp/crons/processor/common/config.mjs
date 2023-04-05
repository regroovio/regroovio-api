// config.mjs

import dotenv from "dotenv";
dotenv.config();

export const AWS_DYNAMO = {
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
};

export const PROCESSOR = {
    SLACK_ENDPOINT: process.env.SLACK_ENDPOINT,
};