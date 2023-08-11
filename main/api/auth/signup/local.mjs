import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        email: "nethanielmaoz@gmail.com",
        username: "Asdasdasd!123123",
        password: "Asdasdasd!123123"
    })
    console.log(response)
}
start()