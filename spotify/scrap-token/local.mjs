// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const response = await handler({
        user_id: "X9gHk7zL",
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
    console.log(response);
};

start();

