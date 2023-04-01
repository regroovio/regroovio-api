// scrollToBottom.mjs

const scrollToBottom = async (page) => {
    await page.evaluate("window.scrollTo(0,9999999999999999)");
}

export { scrollToBottom };
