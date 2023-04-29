// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQAPY2aiiPLT8fFY5AIJiHN89OngJyVG4QTj_5LYSQGzv1QxKPtyhr3B-oOhW0I9YrgOzUe34TyXNXqf36dLNHA0Q6-IpnNtnUam3eLbdSHYykHADah0aSWoIiW1x4jnClCMWANsKpyUg_BuFwI6-T-IPi7LF-pwuDeTduvVX5O1wXdmyOlFyGmCHvoBG9vnnZ7HsI3Or-JBbbrt0qtoMEJMyd9u5MsaXSNpdoOJZQ5uAwFhgi5sG5mOLeTRkfkeDhKIYn7zT83SVoEjjsbdNJ-8RhdDdNZ1I3tgqo23cNirjRBHzE8HK3zjQ421v3Q0DeS59m3727WLN7oYBzyecg',
        trackName: 'Deep Down',
        albumName: 'Deep Down',
        artistName: 'Never Dull',
        year: '2022'
    }
    const response = await handler(event);
    console.log(response);
};

start();

