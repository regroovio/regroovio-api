import { handler } from './index.mjs'
const start = async () => {
    const response = await handler(
        {
            amount: 500,
            user_id: process.env.ADMIN_ID,
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        }
    )
    console.log(response)
}
start()
