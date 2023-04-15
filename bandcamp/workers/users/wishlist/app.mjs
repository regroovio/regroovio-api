// wishlist.mjs

import { authenticateUser } from './common/auth.mjs';
import { getUserById } from './common/getUserById.mjs';
import { createTable } from './common/createTable.mjs';
import { WISHLIST } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToDb } from './common/addAlbumsToDb.mjs';
import { scrollToBottom } from './common/scrollToBottom.mjs';
import dotenv from "dotenv";
dotenv.config();

const collectAlbumLinks = async (page) => {
    console.log("getting wishlist...");

    try {
        await page.goto('https://bandcamp.com', {
            waitUntil: 'load',
            timeout: 300000,
        });
    } catch (error) {
        console.log(`Failed to load page: ${error}`);
        throw error;
    }

    await page.waitForSelector(WISHLIST.BUTTON);
    await page.click(WISHLIST.BUTTON);
    await page.waitForSelector(WISHLIST.TABS);
    const tabs = await page.$$(WISHLIST.TABS);
    await tabs[1].click();

    const links = new Set();
    let prevSize = 0, newSize = 1;

    while (prevSize < newSize) {
        prevSize = newSize
        await loadMoreAlbums(page);
        await scrollToBottom(page);
        const albumLinks = await getAlbumLinks(page, WISHLIST.SELECTOR);
        const validAlbumLinks = albumLinks.filter(isValidLink);
        validAlbumLinks.forEach(link => links.add(link));
        newSize = links.size;
        console.log(`[${prevSize ? prevSize : 0}/${newSize}] albums loaded...`);
    };

    return [...links];
};

const loadMoreAlbums = async (page) => {
    try {
        await page.waitForSelector("#wishlist-items > div > button");
        const loadMoreButton = await page.$("#wishlist-items > div > button");
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
    try {
        const { user_id } = event
        if (!user_id) {
            throw new Error('Missing required parameters');
        }
        const user = await getUserById(user_id);
        if (!user) {
            throw new Error(`User not found with id ${user_id}`);
        }
        const table = `bandcamp-wishlist-${user_id}`;
        await createTable(table);
        const { browser, page } = await initializePuppeteer(event);
        console.log(`Logging in user: ${user.username_bandcamp}`);
        const isAuth = await authenticateUser(page, user);
        if (!isAuth) {
            console.log("error logging in");
            return
        }
        const albumLinks = await collectAlbumLinks(page);
        await page.close();
        await browser.close();
        await addAlbumsToDb(table, albumLinks, user_id);
        return { message: 'done' };
    } catch (error) {
        throw new Error(`Error app: ${error}`);
    }
};

export { app };


