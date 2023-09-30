import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({ user_id: "413b15a0-a0b1-7019-e651-77301c7d1f60" })
    console.log(response)
}
start()