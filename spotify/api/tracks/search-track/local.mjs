// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQCbCOrJwMRnkb4jBbMlQj1gF-V5uBugBd8X5PZuSoMfk5MpV-heprGr0rHOU0ud9Yh0ZFWkK1QQEXONJ631b2XQF8e5Xbk633cVYIOdJ_scNEtzAYYKNd0kyivwwKy67YbRJ1XV8N8iM_7jcueAc9k_bCMOlI5O510d_IWXY06tF0XibLITaMcUVItR7vTKbeZA8-LYp1ptVv6MO65rfAor-_Q0pGY8DpRK1s43PrWBgRF3GD4kwPNwNtN__YttEg3SfZ9UTr5MxhK8wPY07vwKZh2wVLedY4AaYu3_LkSeSmSOjBtR_gvZGF2kbim2ed9DoSgOiwkNZXVT_t6Ozg',
        trackName: 'The Tiger',
        albumName: 'The Tiger',
        artistName: 'biome',
        year: '2023'
    }
    const response = await handler(event);
    console.log(response);
};

start();

