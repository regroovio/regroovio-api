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

export const WISHLIST = {
    SELECTOR: `#wishlist-items .collection-title-details a`,
    BUTTON: `#collection-main`,
    TABS: `#grid-tabs > li`,
};