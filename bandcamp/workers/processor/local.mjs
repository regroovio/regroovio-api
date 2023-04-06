import { handler } from './index.mjs'
const start = async () => {
    const response = await handler(
        {
            album: { album_id: 'https://dilushselva.bandcamp.com/track/touch-it-bring-it' },
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        }
    )
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