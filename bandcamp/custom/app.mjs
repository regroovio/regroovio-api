// custom.mjs

import { CUSTOM } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToDb } from './common/addAlbumsToDb.mjs';
import { addAlbumsToS3 } from './common/addAlbumsToS3.mjs';
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";
dotenv.config();

const AWS_DYNAMO = {
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
};

const dynamoClient = new DynamoDB(AWS_DYNAMO);

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
    const table = `regroovio-${genre}-${process.env.STAGE}`;
    try {
        const { browser, page } = await initializePuppeteer(event);
        const albumLinks = await collectAlbumLinks(page, genre);
        await page.close();
        await browser.close();
        const albumsAdded = await addAlbumsToDb(table, albumLinks);
        console.log(`Added ${albumsAdded.length} items.`);
        const response = await addAlbumsToS3({ tableName: table, albums: albumsAdded });
        return {
            functionName: `bandcamp-${genre}-${process.env.STAGE}`,
            scanned: albumLinks.length,
            added: albumsAdded.length
        };
    } catch (error) {
        throw new Error(`bandcamp-${genre}-${process.env.STAGE}: ${error}`);
    }
}

export { app };
