import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        // queryStringParameters: {
        //     popularity: 10,
        //     genres: ["techno", "ambient", "punk", "pop", "hip-hop"]
        // }
    })
    console.log(response);
}

start()