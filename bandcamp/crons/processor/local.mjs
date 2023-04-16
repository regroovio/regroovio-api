import { handler } from './index.mjs'
const start = async () => {
    const response = await
        handler({ table: 'daily' })
    console.log(response)
}
start()