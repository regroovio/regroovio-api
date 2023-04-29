// index.mjs

import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.mjs";
import { slackBot } from "./common/slackBot.mjs";

const handler = async (event, context) => {
    try {
        const startTime = process.hrtime();
        const response = await app(event);
        const endTime = process.hrtime(startTime);
        const minutes = Math.floor(endTime[0] / 60);
        const seconds = (endTime[0] % 60) + (endTime[1] / 1e9);
        console.log(`App runtime: ${minutes}m ${seconds.toFixed(2)}s`);
        const notification = {
            status: "SUCCESS",
            functionName: `${response.functionName}`,
            runtime: `${minutes}m ${seconds.toFixed(2)}s`,
            scanned: response.scanned,
            added: response.added
        };
        await slackBot(notification);
        return {
            body: JSON.stringify(response),
        };
    } catch (error) {
        console.error(`Error handler: ${error}`);
        const notification = {
            status: "FAILURE",
            message: error.message,
        };
        await slackBot(notification);
        return {
            body: JSON.stringify({ error: error }),

        };
    }
};

export { handler };
