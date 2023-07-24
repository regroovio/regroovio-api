// config.mjs

import { setEnvironmentVariables } from "./setEnvironmentVariables.mjs";
import dotenv from "dotenv";
dotenv.config();
await setEnvironmentVariables();

export const AWS_DYNAMO = {
    region: process.env.REGION
};

export const COLLECTION = {
    SELECTOR: `#collection-items .collection-title-details a`,
    BUTTON: `#collection-main`,
    TABS: `#grid-tabs > li`,
};