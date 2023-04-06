import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        email: "nethanielmaoz@gmail.com",
        password: "testtest!123123"
    })
    console.log(response)
}
start()

// GENRES:

// 'brooklyn'
// 'london'
// 'montreal'
// 'tel-aviv'

// 'alternative'
// 'electro-pop'
// 'synth pop'
// 'hardcore'
// 'hip-hop'
// 'house'
// 'daily'
// 'trap'
// 'pop'

// 'daily'
// 'feed'
