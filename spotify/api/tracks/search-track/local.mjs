// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQDyMcPou75M0CNTgBdjD3Q97A6Ahmjpj4DKndAv_U_piYx3SeNYn95jHk7odVXtMQb8WnIiniAmWsk0qPtOAIcVSRRejG1IlGOThPcOyUdFWA55Nzy3QkI6hjFe2xof46JNHcuSMkpYQa_J-reHBnL5ZGnffS5zdZnqZRLz4NDIB-tkHQdJwTUVtcZWwpunEt235rqS0p0DKlQG5stSX-tjxhmpNv5z4Z4cNXXcOrRtjhENYjrNf1TSswxtNxcFGdYbbdjFUzgbpOdwuNHX-qsVtLsFdqsqn6Q6coqm8yRxO9GLIM6UcTJHb-rXoPC8ePY_-nTd1VRMr8br7mJTvw',
        trackName: 'Hammer & YSANNE - Synco',
        albumName: 'Remmah Rundown',
        artistName: 'Various Artists',
        year: '2023'
    };
    const response = await handler(event);
    console.log(response);
};

start();

