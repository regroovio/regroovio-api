import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({ queryStringParameters: { popularity: 30 } })
    console.log(response)
}
start()