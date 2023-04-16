// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQAoDQVSZKdU_YUdJ_M5GdLKwoYG3ehrB3P3hlMoGlQulWRSSXlpSo--EShD1IPY2vfGFAOux9HBWg1aPWZAPXJmY7rua-62SADcxeM8mXzNWWHBQ-fpB9Z7HpCtPj_wz8zufxY0nWFSdk06uanf1lEivnHeHzy7Esdn_do78Fnp9EWc_r1kEIvvBY5LIIzvDTsglCIGDYcpnsjz5yMfGuWlwZXhvEaOOfXPvbGTQysUz-G9gsLtFYFbZfR2L0i5yVHsXXPunFvvnhrSO5FbZmuz7u47ZnB1GwPVo84ss8WhukFAUYKjQXs4i91IHZ5Gfl-NctNZB0Zl-xwYlamfrQ',
        trackName: 'Do Re Mi',
        albumName: 'TOY CITY',
        artistName: 'Toy City',
        year: '2023'
    };
    const response = await handler(event);
    console.log(response);
};

start();

