// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQCkDIUbY664ck_irou-7ZQcyBf1FA-e_qjkPupuBmkWTumcXpUQmDfQvIXjnVvTehLAJa3V3S_DZ0Q_LN1NpMLvFqiFl0C9GlXr2ucOATU308sC8rGwLgNRghabQCNRitotbqhhszpwoRHvTgPX2MiVKgvsoZD01xlGOPgJAtltaZriiQraSYtxPmFshPE_FERvK2Bd1X9RpAdjmUCvCkE0SAIEU0JuwN6u1CN2oL9drnEALfhH0yYj-ZzOhMulKdbcYZz6rQIFPVzWOPmlIc61EntvKS0xCdrNnpfXiapr3keOK3tcMz3d5Ylb3qCPuikaOMCPvoTsRAOHLH0i1A',
        trackName: 'CARV & DeGuzman - Control Like',
        albumName: 'Hidden Gems Vol.2',
        artistName: '999999999',
        year: '2023'
    }
    const response = await handler(event);
    console.log(response);
};

start();

