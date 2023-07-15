import { handler } from './index.mjs'
const start = async () => {
    const response = await handler(
        {
            tableName: 'regroovio-daily-prod',
            album: {
                album_id: "6088abb7a1b658fbc1fb0399e0c258fd835360c6bb964802c987888f60f32009",
                url: "https://draagdraag.bandcamp.com/track/mitsuwa"
            },
        }
    )
    console.log(response)
}
start()