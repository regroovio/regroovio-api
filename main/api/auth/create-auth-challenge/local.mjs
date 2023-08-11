import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        phoneNumber: "0504888068"
    })
    console.log(response)
}
start()