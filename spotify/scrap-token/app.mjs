// app.mjs

import { AUTH_LAMBDA } from './common/config.mjs';
import { saveTokens } from "./common/saveTokens.mjs";
import { saveCookies } from "./common/saveCookies.mjs";
import { getUserById } from './common/getUserById.mjs';
import { initializePuppeteer } from "./common/browser.mjs";

const runApp = async (event, context) => {
    const user_id = event.user_id || event.queryStringParameters.user_id;
    const { browser, page } = await initializePuppeteer(event);
    let user;

    try {
        user = await getUserById(user_id);
        if (!user) {
            throw new Error('User not found');
        }
    } catch (err) {
        throw new Error(`Error retrieving user from DynamoDB: ${err}`);
    }

    try {
        const tokens = await handleAuthentication(page, user);
        await page.close();
        await browser.close();
        await saveTokens(user, tokens);

        return tokens
    } catch (err) {
        throw new Error(`Error retrieving token: ${err}`);
    }
};

const handleAuthentication = async (page, user) => {
    let endpoint = `${AUTH_LAMBDA}/login`;
    if (user.refresh_token_spotify) {
        console.log('Refreshing token');
        endpoint = `${AUTH_LAMBDA}/refresh?refresh_token=${user.refresh_token_spotify}`
    } else if (!user.spotify_cookies?.length) {
        console.log('Logging in using credentials');
    } else {
        console.log('Using cookies');
        await page.setCookie(...user.spotify_cookies);
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

export { runApp };
