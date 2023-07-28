// collection.mjs

import { authenticateUser } from './common/auth.mjs';
import { getUserById } from './common/getUserById.mjs';
import { createTable } from './common/createTable.mjs';
import { COLLECTION } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToQueue } from './common/addAlbumsToQueue.mjs';
import { scrollToBottom } from './common/scrollToBottom.mjs';

const collectAlbumLinks = async (page) => {
    console.log("getting collection...");

    try {
        await page.goto('https://bandcamp.com', {
            waitUntil: 'load',
            timeout: 300000,
        });
    } catch (error) {
        console.log(`Failed to load page: ${error}`);
        throw error;
    }

    await page.waitForSelector(COLLECTION.BUTTON);
    await page.click(COLLECTION.BUTTON);
    await page.waitForSelector(COLLECTION.TABS);
    const tabs = await page.$$(COLLECTION.TABS);
    await tabs[0].click();

    const links = new Set();
    let prevSize = 0, newSize = 1;

    while (prevSize < newSize) {
        prevSize = newSize
        await loadMoreAlbums(page);
        await scrollToBottom(page);
        const albumLinks = await getAlbumLinks(page, COLLECTION.SELECTOR);
        const validAlbumLinks = albumLinks.filter(isValidLink);
        validAlbumLinks.forEach(link => links.add(link));
        newSize = links.size;
        console.log(`[${prevSize ? prevSize : 0}/${newSize}] albums loaded...`);
    };

    return [...links];
};

const loadMoreAlbums = async (page) => {
    try {
        await page.waitForSelector("#collection-items > div > button");
        const loadMoreButton = await page.$("#collection-items > div > button");
        if (loadMoreButton) {
            await loadMoreButton.click();
        }
    } catch (err) { }
};

const isValidLink = (link) => {
    try {
        return link.includes("com/album") || link.includes("com/track");
    } catch (error) {
        console.log(error);
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
        const table = `regroovio-collection-${user_id}`;
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
        const albumsAdded = await addAlbumsToQueue(table, albumLinks);
        console.log(`Added ${albumsAdded.length} items.`);
        return {
            functionName: `bandcamp-collection-${process.env.STAGE}`,
            scanned: albumLinks.length,
            added: albumsAdded.length
        };
    } catch (error) {
        throw new Error(`Error app: ${error}`);
    }
};

export { app };


