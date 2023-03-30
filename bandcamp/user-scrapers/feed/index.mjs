// index.mjs

import dotenv from "dotenv";
import { app } from "./app.mjs";

dotenv.config();

const handler = async (event, context) => {
    try {
        const result = await app(event);
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error(`Error handler: ${error}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
            exitCode: process.exit(1), // Add this line to exit the program when an error occurs
        };
    }
};

export { handler };
