// scrollToBottom.mjs

async function scrollToBottom(page) {
    await page.evaluate("window.scrollTo(0,9999999999999999)");
}

export { scrollToBottom };
