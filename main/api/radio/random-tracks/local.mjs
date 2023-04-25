import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({ popularity: 50 })
    console.log(response)
}
start()