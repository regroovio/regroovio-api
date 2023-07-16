// feed.mjs

import { authenticateUser } from './common/auth.mjs';
import { getUserById } from './common/getUserById.mjs';
import { createTable } from './common/createTable.mjs';
import { FEED } from './common/config.mjs';
import { initializePuppeteer } from './common/browser.mjs';
import { getAlbumLinks } from './common/getAlbumLinks.mjs';
import { addAlbumsToDb } from './common/addAlbumsToDb.mjs';
import { scrollToBottom } from './common/scrollToBottom.mjs';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import dotenv from "dotenv";
dotenv.config();

const lambdaClient = new LambdaClient({ region: process.env.REGION });

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

const invokeLambda = (params) => {
    const command = new InvokeCommand(params);
    return lambdaClient.send(command);
};
const app = async (event) => {
    try {
        const { user_id, amount } = event
        if (!user_id) {
            throw new Error('Missing required parameters');
        }
        const user = await getUserById(user_id);
        if (!user) {
            throw new Error(`User not found with id ${user_id}`);
        }
        const table = `regroovio-feed-${user_id}`;
        await createTable(table);
        const { browser, page } = await initializePuppeteer(event);

        console.log(`Logging in user: ${user.username_bandcamp}`);
        const isAuth = await authenticateUser(page, user);
        if (!isAuth) {
            console.log("error logging in");
            return
        }
        const albumLinks = await collectAlbumLinks(page, amount);
        await page.close();
        await browser.close();
        const albumsAdded = await addAlbumsToDb(table, albumLinks);
        console.log(`Added ${albumsAdded.length} items.`);
        invokeLambda({
            FunctionName: `regroovio-downloader-${process.env.STAGE}`,
            Payload: JSON.stringify({ tableName: table })
        });
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
