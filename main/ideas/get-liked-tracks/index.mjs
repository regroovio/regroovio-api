// index.mjs

import { setEnvironmentVariables } from "./common/setEnvironmentVariables.mjs";

import { app } from "./app.mjs";

const handler = async (event, context) => {
  try {
    await setEnvironmentVariables();
    const startTime = process.hrtime();
    const result = await app(event);
    const endTime = process.hrtime(startTime);
    const minutes = Math.floor(endTime[0] / 60);
    const seconds = (endTime[0] % 60) + (endTime[1] / 1e9);

    console.log(`App runtime: ${minutes}m ${seconds.toFixed(2)}s`);

    return {
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.log(`Error handler: ${error}`);
    return {
      body: JSON.stringify({ error: error }),

    };
  }
};

export { handler };
