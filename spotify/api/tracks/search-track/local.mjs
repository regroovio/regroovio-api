// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQCplgDmBobCo4aZ3PR1bUWdKyB4zK6y1z9A1g0mShg3aIcU4eYReqOPpOOhxoS-QT8K5clBFcTYQwMdgVqIFhxXiUqSOsIu4qeaxQx7TYx4eFlQw29Q91l7j2D2rziKzc-va4TfbHgjm1ugLapz8uqN2KTsecivATAWLl5DhynquQlMkJqmz75CkHv5rqDFBXjUu_33yowBwNeNIbw9NZnM0nJky8jmSzVoK29rzo944dOyjyrw8PrDLOKPbIsr8x-ov3B06wcv8_vdbWX-FHlgZpmuhhA7rJg8a_HE-GeF26bqcUmxhB-EBCBDaAjHGOSk_7biR2tYL-iR_oWS',
        trackName: 'xxapx, Nekrah - Maledictio',
        albumName: 'WATCH ME BURN',
        artistName: 'xxapx',
        year: '2023'
    }
    const response = await handler(event);
    console.log(response);
};

start();

