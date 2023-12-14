import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        email: "nethanielmaoz@gmail.com",
        username: "nethanielmaoz",
        confirmationCode: "352316"
    })
    console.log(response)
}
start()