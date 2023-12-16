import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        queryStringParameters: {
            popularity: 10,
        }
    })
    console.log(response);
}

start()