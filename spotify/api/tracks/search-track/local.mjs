// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQDv-mGAEKAv6AUQ1jmGTwM2mgnoiYIFpZpcR-lMdpaOWhojw1T2QRybZWwDrrECFOxKVpu4DN49LfbovnfVfkiWa50n-uDnH97SYo2zVogI0FSVUPaaogZIPk3dXYcysBsyXVtoW_zZuN-yQ9tkOd-BLzWKEZEAffeWtGfXOxd1eFy4IJ4ih5aeqkKKzQxN4YVuVDrE81mS275KfarJP1R4KhcCMPWMRscmJm_HZlaHJ3UdkjKT4KYjKcopbrhecc0TmuWDJJ0cZ0NSw4xztx3Y90mYqfRRbjNhnhfjhzM1TqqgsodoiT2hWS1mfAOopKIwxkf1yczZB_eHmaTAcw',
        trackName: 'Do Re Mi',
        albumName: 'TOY CITY',
        artistName: 'Toy City',
        year: '2023'
    };
    const response = await handler(event);
    console.log(response);
};

start();

