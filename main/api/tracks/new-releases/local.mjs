import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        queryStringParameters: {
            popularity: 10,
            days: 30
        }
    })
    console.log(response);
}

start()