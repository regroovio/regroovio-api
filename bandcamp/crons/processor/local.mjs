import { handler } from './index.mjs'
const start = async () => {
    const response = await
        handler({ table: 'X9gHk7zL' })
    console.log(response)
}
start()