// local.mjs

import { handler } from './index.mjs';


const start = async () => {
    const response = await handler({
        sourceTrack: "https://albums-regroovio.s3.us-east-1.amazonaws.com/bandcamp/Barry%20Can%27t%20Swim/Amor%20Fati%20EP/El%20Layali.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATFEQG44VHS54M7PT%2F20230416%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20230416T160038Z&X-Amz-Expires=604800&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEDgaCXVzLWVhc3QtMSJIMEYCIQCsOhbGm3LVAkWk6WYdh7gKe81Beg%2BXpDMBYXdx9alXkwIhAI7jCIJtJI0YkI4LJxN38ym687ZLz7F9nYfbfNaFVnHpKo0DCDEQARoMMjE3MTk4MjkwNzMwIgwnC67F%2FSDNAaR7kYwq6gK2VOvxtmEgabmgVHNkaHcnsrSXJOnBCWl1U6QpP6nSaTaVYKWWZPceIZ%2BeiuXx1MH6e6ewfSzLM0eV7Jxpt3RZ6HmhOB5TBr65DC43%2BRAXtTLb4dWgK7Es7KNBYiJbaIXHo%2FtAIVPDGqVlDPh17fvZgViM1x1bc%2BaRA9bylg%2F1j635yaS9FTlaf99%2BA7rDZyC041C8ATw%2BJoI1ZRoxqyJWaR2Mf3KSu%2FRWD77yFUzYiTr2R77HI%2BIP%2BHPsIQbf9hQGCG3VbF7axYwbc0YzZ2qnq9mtiuyHA7QRUvCWC5%2Bt4Tmu6RlJxin4lxAU9lU3KvbWrKah6%2BpNyEhjRN%2BzF%2BgT%2BMI3xvhBPMYCOm3FT%2FBBJB%2FLua%2F%2B96xkCcEuI%2Bkxi%2FTtlyf3VXhHYhmBF%2FJ1r0gk3r5wB%2FZ1jIzLexP0WfTb3avP1vm9U9BLmBXysx1m%2BHL9ACHmEk5ztBX6%2B39Lqp4EwsR0WLD2i%2FkAazCkt%2FChBjqcAbGczjc40XMJOkxQMEc%2FIJQEr4XKybuMgnzHmPSzSRnQxWInDPxaolMQAoCSp4uXSTV5Ap7IxWNudwOJIyDzXOFmZzshpKtRuF%2F9sOaL4RCf3Qr%2BzxvjHofhavmx5tPPqBV78sSSN8ICR0DnueiijZPG9ngkq0U6skr67ynOL7vp7PliyZ%2Fgy3Kx9IN6lpp80HVvvKmx%2Be3lBAQTHQ%3D%3D&X-Amz-Signature=62dbad54068698a37d649bf7e5e92eb44fbc2c2bcce028515124e2301cfe2fb4&X-Amz-SignedHeaders=host&x-id=GetObject", // correct track
        targetTrack: "https://p.scdn.co/mp3-preview/f88c1f8bca7475a4024b9c96f9e1d92160042fb4?cid=a5d89672a835486c952dddf93dba44b3"
    });
    console.log(response);
};

start();

