// local.mjs

import dotenv from 'dotenv';
import { handler } from './index.mjs';

dotenv.config();

const start = async () => {
    const response = await handler({
        user_id: process.env.ADMIN_ID,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
    console.log(response);
};

start();

