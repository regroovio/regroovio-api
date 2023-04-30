// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQA838lgDqH_3eqtIaV7u5ANoF75k0R8odiP5yLVOu4WBZ86Voz6EFf9Cjc0qaQ0omPB9z90shamhvKJ-SV1OaTqYUZEPKKihkApxjkEhZlFPs5L_n3yQKVmMuvB4iYV9R-31O4eCLhhGZrNP2r2eF1GEcezcGM2SyQm1wsfFUGsxs2i7LEV78D3zLtheXKxJ_U8xlSQfD2AB1FDx0C-xaGPWxwS1M1EUW8XhpbMJ0yuf1qi-Dwzq5wlt1JmKsArGgflWxR-jnGaVVU6SkavaEstltai_xek2U9_lqMeL4jCH1ndM2Tc3CqW06H1PsfiJD2xxRNegjbmoyoh_IH5Sg',
        trackName: 'Coco Bryce - Mantra',
        albumName: 'Neptune',
        artistName: 'RuptureLDN',
        year: '2023'
    }
    const response = await handler(event);
    console.log(response);
};

start();

