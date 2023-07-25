import { handler } from './index.mjs'
const start = async () => {
    const response = await handler(
        {
            tableName: 'regroovio-hip-hop-rap-prod',
        }
    )
    console.log(response)
}
start()