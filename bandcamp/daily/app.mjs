// daily.mjs

import { DAILY } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToQueue } from './common/addAlbumsToQueue.mjs';

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
        console.log(error);
        return false;
    }
};

const app = async (event) => {
    const table = `regroovio-daily-${process.env.STAGE}`;
    try {
        const { browser, page } = await initializePuppeteer(event);
        const albumLinks = await collectAlbumLinks(page);
        await page.close();
        await browser.close();
        const albumsAdded = await addAlbumsToQueue(table, albumLinks);
        console.log(`Added ${albumsAdded.length} items.`);
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
