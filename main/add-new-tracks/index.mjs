// index.mjs

import { app } from "./app.mjs";

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
      body: JSON.stringify({ error: error }),
      exitCode: process.exit(1),
    };
  }
};

export { handler };
