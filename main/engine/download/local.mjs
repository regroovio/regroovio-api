import { handler } from './index.mjs'

const start = async () => {
    const response = await handler({ user_id: process.env.ADMIN_ID })
    console.log(response)
}
start()