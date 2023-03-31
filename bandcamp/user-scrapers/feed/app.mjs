// feed.mjs

import { authenticateUser } from './common/auth.mjs';
import { getUserById } from './common/getUserById.mjs';
import { createTable } from './common/createTable.mjs';
import { AWS_DYNAMO, FEED } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToDb } from './common/addAlbumsToDb.mjs';
import { scrollToBottom } from './common/scrollToBottom.mjs';
import dotenv from "dotenv";
dotenv.config();

const collectAlbumLinks = async (page, amount) => {
    console.log('Getting feed...');

    try {
        await page.goto('https://bandcamp.com', {
            waitUntil: 'load',
            timeout: 300000,
        });
    } catch (error) {
        console.log(`Failed to load page: ${error}`);
        throw error;
    }

    await page.waitForSelector(FEED.BUTTON);
    await page.click(FEED.BUTTON);

    const links = new Set();
    let newSize = 0;

    while (newSize < amount) {
        await loadMoreAlbums(page);
        await scrollToBottom(page);
        const albumLinks = await getAlbumLinks(page, FEED.SELECTOR);
        const validAlbumLinks = albumLinks.filter(isValidLink);

        for (const link of validAlbumLinks) {
            if (newSize >= amount) break;
            links.add(link);
            newSize = links.size;
            console.log(`[${newSize ? newSize : 0}/${amount}] albums loaded...`);
        }
    }

    return [...links];
};

const loadMoreAlbums = async (page) => {
    try {
        await page.click(".count");
    } catch (error) { }
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
    try {
        const { user_id, amount } = event
        if (!user_id) {
            throw new Error('Missing required parameters');
        }
        const user = await getUserById(user_id, AWS_DYNAMO);
        if (!user) {
            throw new Error(`User not found with id ${user_id}`);
        }
        const table = `bandcamp-feed-${process.env.STAGE}`;
        await createTable(table);
        const { browser, page } = await initializePuppeteer(event);
        await authenticateUser(page, user);
        const albumLinks = await collectAlbumLinks(page, amount);
        await page.close();
        await browser.close();
        await addAlbumsToDb(table, albumLinks, user_id);
        return { message: 'done' };
    } catch (error) {
        throw new Error(`Error app: ${error}`);
    }
};

export { app };
