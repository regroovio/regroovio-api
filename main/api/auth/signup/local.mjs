import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        phoneNumber: "0504888068",
        username: "asdasdasd!123123"
    })
    console.log(response)
}
start()