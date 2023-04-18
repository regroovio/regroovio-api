// getAlbumLinks.mjs

const getAlbumLinks = async (page, selector) => {
    await page.waitForSelector(selector);
    return await page.evaluate(
        (s) => Array.from(document.querySelectorAll(s)).map((link) => link.href),
        selector
    );
};

export { getAlbumLinks };
