import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        queryStringParameters: {
            popularity: 20,
            genres: "hip-hop-rap, pop, house, r-b, edm, trap, electronic, alternative-rock, indie-pop"
        }
    })
    console.log(response);
}

start()