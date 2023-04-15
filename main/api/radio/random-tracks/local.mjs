import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({ section: 'trap' })
    console.log(response)
}
start()