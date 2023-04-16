// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: "BQDb7T-WzxjoB7SDPcCSeD_bYm1DeexlLDwFqVWPg-Mu57xM9eVHkec14jTnZpDBcoKVuy-v-S5Se3QbvgTWT0xb58uhy3tMb6l-UAKJ-HxvxQxieBgfGiy2vINUt43DKm4WKk0tss2KoogkZjTM_TcBdK2gEMOGdZNBKpZkxpFS2utmE6lLDQ522yxAjHlh4F3uz9PPzCxp7j1Eph2H9qLb4TRZIpLpqkyr7ytWCq_EFJgJ_vJhjMW4IUG-GFuIVaMjIz3ygnBkoKmEMaQM712N8HiLUkGdxTnEvxmWIFIPqD3AFSi_rx1XmFnT_k2i-9VkP3kaeZtzoyBUqSClbQ",
        trackName: "Bohemian Rhapsody",
        albumName: "touch it bring it",
        year: "1975",
    };
    const response = await handler(event);
    console.log(response);
};

start();

