// config.mjs

import { setEnvironmentVariables } from "./setEnvironmentVariables.mjs";
import dotenv from "dotenv";
dotenv.config();
await setEnvironmentVariables();

export const AWS_DYNAMO = {
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
};

export const FEED = {
    SELECTOR: `#story-list div.story-innards.collection-item-container.track_play_hilite > div.story-body > div.tralbum-wrapper.cf > div.tralbum-wrapper-col1 > div.tralbum-details > a`,
    BUTTON: '#feed-main',
};