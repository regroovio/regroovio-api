// local.mjs

import { handler } from './index.mjs';

const start = async () => {
    const event = {
        token: 'BQDdFyHUVqd52e9mrQ1Xv-SypyM2AlgiQHaF91Tf21CGNh5mDu8yu-oeGu8pF89jL0mTzJ1PEWBNd7mL4lxgDVuh0wr1PCqxeMLOqV4QpSKjsX5HF3a6PksCDGsBrcis2uXXD5VU3raDaYDfKn1NpgOzz_Mu08ZMmyPrU2Wu_UPYuMDfEtfmGgNhuls6K_t8qxB581YHfYwbffIKZE-0UERArK31sLzpIwSsWLma_j_snnofPX7BO7NgHC_Rx7g-7Iuk9H8kWyOEg_pjjxPiTA6OP7H668kaowqtEhgK7QXS-3JxcIqpOh1rXLwgO8HAF1UlR2ntZCvBDw079r9-Aw',
        trackName: 'Ganja White Night, CloZee - Infinity',
        albumName: 'Unity',
        artistName: 'Ganja White Night',
        year: '2023'
    }
    const response = await handler(event);
    console.log(response);
};

start();

