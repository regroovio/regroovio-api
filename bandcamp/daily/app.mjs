// daily.mjs

import { DAILY } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToDb } from './common/addAlbumsToDb.mjs';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import dotenv from "dotenv";
dotenv.config();

const lambdaClient = new LambdaClient({ region: process.env.REGION });

const collectAlbumLinks = async (page) => {
    console.log("getting daily...");

    try {
        await page.goto('https://bandcamp.com', {
            waitUntil: 'load',
            timeout: 300000,
        });
    } catch (error) {
        console.log(`Failed to load page: ${error}`);
        throw error;
    }

    const links = new Set();
    let prevSize = 0, newSize = 1;

    while (prevSize < newSize) {
        prevSize = newSize
        await loadMoreAlbums(page);
        const albumLinks = await getAlbumLinks(page, DAILY.SELECTOR);
        const validAlbumLinks = albumLinks.filter(isValidLink);
        validAlbumLinks.forEach(link => links.add(link));
        newSize = links.size;
        console.log(`[${prevSize ? prevSize : 0}/${newSize}] albums loaded...`);
    };

    return [...links];
};

const loadMoreAlbums = async (page) => {
    try {
        await page.waitForSelector(".stepper-next");
        const loadMoreButton = await page.$(".stepper-next");
        if (loadMoreButton) {
            await loadMoreButton.click();
        }
    } catch (err) { }
};

const isValidLink = (link) => {
    try {
        return link.includes("com/album") || link.includes("com/track");
    } catch (error) {
        console.error(error);
        return false;
    }
};

const invokeLambda = (params) => {
    const command = new InvokeCommand(params);
    return lambdaClient.send(command);
};

const app = async (event) => {
    const table = `regroovio-daily-${process.env.STAGE}`;
    try {
        const { browser, page } = await initializePuppeteer(event);
        const albumLinks = await collectAlbumLinks(page);
        await page.close();
        await browser.close();
        const albumsAdded = await addAlbumsToDb(table, albumLinks);
        console.log(`Added ${albumsAdded.length} items.`);
        invokeLambda({
            FunctionName: `regroovio-downloader-${process.env.STAGE}`,
            Payload: JSON.stringify({ tableName: table })
        })
        return {
            functionName: `bandcamp-daily-${process.env.STAGE}`,
            scanned: albumLinks.length,
            added: albumsAdded.length
        };
    } catch (error) {
        throw new Error(`bandcamp-daily-${process.env.STAGE}: ${error}`);
    }
};

export { app };
