import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({ queryStringParameters: { popularity: 50 } })
    console.log(response)
}
start()