import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        username: "nethanielmaoz"
    })
    console.log(response)
}
start()