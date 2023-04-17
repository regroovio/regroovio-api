// local.mjs

import { handler } from './index.mjs';


const start = async () => {
    const response = await handler({
        bufferSizeFraction: 200,
        // sourceTrack: "https://p.scdn.co/mp3-preview/d0a2efd43cb70c7290b1fca72c138ace572859ae?cid=a5d89672a835486c952dddf93dba44b3",
        sourceTrack: "https://p.scdn.co/mp3-preview/57cdc7a578e90a6c3bcf034bb6be19bf3c072d52?cid=a5d89672a835486c952dddf93dba44b3",
        targetTrack: 'https://p.scdn.co/mp3-preview/57cdc7a578e90a6c3bcf034bb6be19bf3c072d52?cid=a5d89672a835486c952dddf93dba44b3'
    },);
    console.log(response);
};

start();

