import { handler } from './index.mjs'
const start = async () => {
    const response = await handler(
        {
            tableName: 'regroovio-daily-prod',
        }
    )
    console.log(response)
}
start()