// local.mjs

import { handler } from './index.mjs';


const start = async () => {
    const response = await handler({
        sourceTrack: "https://albums-regroovio.s3.us-east-1.amazonaws.com/bandcamp/Various%20Artists/Remmah%20Rundown/Hammer%20%26%20KILIMANJARO%20-%20Sickwave.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIATFEQG44VPLHDH73Z%2F20230416%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20230416T222744Z&X-Amz-Expires=3600&X-Amz-Signature=6598d4e4b4f81ef411a9700281bdb63529638bf5c553f25221af68ff13ac0c24&X-Amz-SignedHeaders=host&x-id=GetObject", // correct track
        targetTrack: "https://p.scdn.co/mp3-preview/705a07ac8a988b4356ba429902251de6031edaf0?cid=a5d89672a835486c952dddf93dba44b3"
    });
    console.log(response);
};

start();

