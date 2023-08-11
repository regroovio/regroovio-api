import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        phoneNumber: "504888068",
        username: "testtest!123123"
    })
    console.log(response)
}
start()