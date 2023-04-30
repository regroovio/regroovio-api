// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQBFDpZtvo-yEpq83MvPmWgGJEFQqBFAKKul5sCSQa2xGgx7Xx-3TuplzYhdL9FTvQOnKil8F4edEJRxBOFMP5nE9lHxOmzHNZgNTxkPVyUpEVj1oe7rFf5xcPfO6Hh9sb0TNvtvRqt1ZKkAnWhaa4sy5OYLZYVto4aWbY8a2axD_JqkZstaIFSbyC2Gds_XbvqED0d0A5HOih_wibqQyFExNRHSKaSc1Ovo5sXq-meeeGaUlfmH1EEPtUn8MrDq_8W8rrXQamiJURYn5y9ugXdTntx4CO8Y3iwfz37g4YCEIZDvi4cVB0vsld6L2ShN8LHNrCEdZqKptLm2KXFKaA',
        trackName: 'Workahol',
        albumName: '064',
        artistName: 'Minor Science',
        year: '2023'
    }
    const response = await handler(event);
    console.log(response);
};

start();

