import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        email: "nethanielmaoz@gmail.com",
        username: "nethanielmaoz",
        password: "Asd!9898"
    })
    console.log(response)
}
start()