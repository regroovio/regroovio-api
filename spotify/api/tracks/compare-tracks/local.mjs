// local.mjs

import { handler } from './index.mjs';


const start = async () => {
    const response = await handler({
        bufferSizeFraction: 200,
        // sourceTrack: "https://p.scdn.co/mp3-preview/d0a2efd43cb70c7290b1fca72c138ace572859ae?cid=a5d89672a835486c952dddf93dba44b3",
        sourceTrack: "https://albums-regroovio.s3.us-east-1.amazonaws.com/bandcamp/Napoleon%20Da%20Legend/Le%20Dernier%20Glacier/Courage%20ft.%20K-rip%20%26%20Lexy.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIATFEQG44VPLHDH73Z%2F20230417%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20230417T173823Z&X-Amz-Expires=3600&X-Amz-Signature=8de60cafe4ec87cf973c89da7bf338ec6b679bf62dd4ff7953c7a2a075b9a415&X-Amz-SignedHeaders=host&x-id=GetObject",
        targetTrack: 'https://p.scdn.co/mp3-preview/f255d7ba49cfa2fb1f7867fbfe0e6f9bd22d5447?cid=a5d89672a835486c952dddf93dba44b3'
    },);
    console.log(response);
};

start();

