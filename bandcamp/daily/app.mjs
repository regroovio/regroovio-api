// daily.mjs

import { DAILY } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToDb } from './common/addAlbumsToDb.mjs';
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";
dotenv.config();

const AWS_DYNAMO = {
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
};

const dynamoClient = new DynamoDB(AWS_DYNAMO);

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

const app = async (event) => {
    const table = `regroovio-daily-${process.env.STAGE}`;
    try {
        const { browser, page } = await initializePuppeteer(event);
        const albumLinks = await collectAlbumLinks(page);
        await page.close();
        await browser.close();
        const initialItemCount = await getTotalItemsInTable(table);
        await addAlbumsToDb(table, albumLinks);
        const finalItemCount = await getTotalItemsInTable(table);
        const numberOfItemsAdded = finalItemCount - initialItemCount;
        console.log(`Added ${numberOfItemsAdded} items.`);
        return {
            functionName: `bandcamp-daily-${process.env.STAGE}`,
            scanned: albumLinks.length,
            added: numberOfItemsAdded
        };
    } catch (error) {
        throw new Error(`bandcamp-daily-${process.env.STAGE}: ${error}`);
    }
};

const getTotalItemsInTable = async (table) => {
    const params = {
        TableName: table,
        Select: "COUNT",
    };

    let totalItems = 0;
    let lastEvaluatedKey = null;

    try {
        do {
            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const response = await dynamoClient.scan(params);
            totalItems += response.Count;
            lastEvaluatedKey = response.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return totalItems;
    } catch (error) {
        console.log(`Error getting total items in table: ${error}`);
        throw error;
    }
};

export { app };
