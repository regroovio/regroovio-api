// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const response = await handler();
    console.log(response);
};

start();

