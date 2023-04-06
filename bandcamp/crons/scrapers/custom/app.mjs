// custom.mjs

import { CUSTOM } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToDb } from './common/addAlbumsToDb.mjs';
import { setEnvironmentVariables } from './common/setEnvironmentVariables.mjs';

import { slackBot } from './common/slackBot.mjs';
import dotenv from "dotenv";
dotenv.config();

const collectAlbumLinks = async (page, genre) => {
    console.log(`getting ${genre}...`);

    const url = `https://bandcamp.com/tag/${genre}?tab=all_releases` // ${query ? `&s=${query}` : ""}

    try {
        await page.goto(url, {
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
        const albumLinks = await getAlbumLinks(page, CUSTOM.SELECTOR);
        const validAlbumLinks = albumLinks.filter(isValidLink);
        validAlbumLinks.forEach(link => links.add(link));
        newSize = links.size;
        console.log(`[${prevSize ? prevSize : 0}/${newSize}] albums loaded...`);
    };

    return [...links];
};


const loadMoreAlbums = async (page) => {
    try {
        await page.waitForSelector(".view-more");
        const loadMoreButton = await page.$(".view-more");
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

const app = async (event) => {
    const { genre } = event
    if (!genre) {
        throw new Error('Missing required parameters');
    }
    await setEnvironmentVariables();
    const table = `bandcamp-${genre}-${process.env.COGNITO_USER_POOL_ID}`;
    console.log(table);
    return
    try {
        const { browser, page } = await initializePuppeteer(event);
        const albumLinks = await collectAlbumLinks(page, genre);
        await page.close();
        await browser.close();
        await addAlbumsToDb(table, albumLinks);
        const response = { functionName: `bandcamp-cron-${genre}-${process.env.STAGE}`, message: `Success. Scanned ${albumLinks.length} items.` }
        await slackBot(response);
        return response;
    } catch (error) {
        const response = { functionName: `bandcamp-cron-${genre}-${process.env.STAGE}`, message: error.message }
        await slackBot(response);
        throw new Error(`Error: ${error}`);
    }
}

export { app };
