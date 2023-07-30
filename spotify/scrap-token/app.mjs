// app.mjs

import { saveTokens } from "./common/saveTokens.mjs";
import { saveCookies } from "./common/saveCookies.mjs";
import { getUserById } from './common/getUserById.mjs';
import { initializePuppeteer } from "./common/browser.mjs";

const app = async (event) => {
    console.log(event);
    const user_id = event.user_id
    let user;

    try {
        console.log(`Retrieving user with id ${user_id}`);
        user = await getUserById(user_id);
        if (!user) {
            throw new Error(`User not found with id ${user_id}`);
        }
    } catch (err) {
        throw new Error(`Error retrieving user from DynamoDB: ${err}`);
    }

    const { browser, page } = await initializePuppeteer(event);

    try {
        const tokens = await handleAuthentication(page, user);
        await page.close();
        await browser.close();

        if (!tokens?.access_token) {
            return { statusCode: 500, error: 'No access token found' };
        }

        await saveTokens(user, tokens);
        return { statusCode: 200, tokens };
    } catch (err) {
        return { statusCode: 500, error: err };
    }
};

const handleAuthentication = async (page, user) => {
    let endpoint = `https://${process.env.STAGE == 'dev' ? `${process.env.STAGE}.` : ``}${process.env.SPOTIFY_API}/login`;
    if (user.refresh_token_spotify) {
        console.log('Refreshing token');
        endpoint = `https://${process.env.STAGE == 'dev' ? `${process.env.STAGE}.` : ``}${process.env.SPOTIFY_API}/refresh?refresh_token=${user.refresh_token_spotify}`
    } else if (!user.cookies_spotify?.length) {
        console.log('Logging in using credentials');
    } else {
        console.log('Using cookies');
        await page.setCookie(...user.cookies_spotify);
    }
    await page.goto(endpoint);
    const tokens = await getTokens(page);
    if (tokens?.length) {
        return tokens
    }
    return await enterCredentialsAndAcceptAuth(page, user);
};

const enterCredentialsAndAcceptAuth = async (page, user) => {
    try {
        await page.evaluate(() => document.getElementById("login-username").value = "")
        await page.type('#login-username', user.username_spotify);
        await page.type('#login-password', user.password_spotify);
        await page.click('#login-button');
        await saveCookies(page, user);
    } catch { }

    try {
        await page.waitForSelector('[data-testid="auth-accept"]', { timeout: 1000 });
        await page.click('[data-testid="auth-accept"]');
        await saveCookies(page, user);
    } catch (err) {
        if (err.name !== 'TimeoutError') {
            console.log(`Error accepting authorization: ${err}`);
        }
    }
    return await getTokens(page);
};

const getTokens = async (page) => {
    try {
        await page.waitForSelector('pre', { timeout: 1000 });
        return JSON.parse(await page.evaluate(() => document.querySelector('pre').innerText));
    } catch { }
};

export { app };
