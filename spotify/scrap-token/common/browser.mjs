// browser.mjs 

import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
import { addExtra } from 'puppeteer-extra';
import chromium from 'chrome-aws-lambda';
import userAgent from 'user-agents';

const initializePuppeteer = async (event) => {
    const puppeteerExtra = addExtra(chromium.puppeteer);
    puppeteerExtra.use(pluginStealth());
    puppeteerExtra.use(
        RecaptchaPlugin({
            provider: { id: "2captcha", token: process.env.CAPTCHA_KEY },
            visualFeedback: true,
        })
    );

    const browser = await puppeteerExtra.launch({
        executablePath: event.executablePath || (await chromium.executablePath),
        defaultViewport: chromium.defaultViewport,
        args: chromium.args,
        slowMo: 350,
        headless: false,
    });

    const page = await browser.newPage();
    await page.setUserAgent(userAgent.random().toString());
    return { browser, page };
};

export { initializePuppeteer };