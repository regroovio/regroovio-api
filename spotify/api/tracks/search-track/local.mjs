// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: "BQCsCNyhdK-YrEdOuNo1q7eWLYpqkQfjMkp2vnP78hL2kKByX0-3BwBGg54sucf26zistJkI_VB0R60xIR9nQgTXQ-Oe5UfSeOMdSkeWen1eqXjfzxmCd8dNmV0IzQ4uGuolF1Zz6sZgQYSxuHxPitpkSnU8qXwLthfbtvKApS3K5NIg0ABWLKhExJMS-fGViouG5eLaBn4EMRb7GwmnqELB447GQZsmO-IP_Pzn6bQwxDTEcP3GiRQvVkcb4UXUpwuMk4OU0VAw-OinjABCdtO84Yip6NyhtKP7c5LGCMFH0jtA1by7RUXPurewdN4xvhz74ZqztDYz1lJbqwVzeA",
        trackName: "El Layali",
        albumName: "Amor Fati",
        year: "2021",
    };
    const response = await handler(event);
    console.log(response);
};

start();

