// local.mjs

import { handler } from './index.mjs';


const start = async () => {
    const response = await handler({
        sourceTrack: "https://albums-regroovio.s3.us-east-1.amazonaws.com/bandcamp/Napoleon%20Da%20Legend/Le%20Dernier%20Glacier/Peur%20de%20Rien%20ft.%20Nikkfurie.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIATFEQG44VPLHDH73Z%2F20230417%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20230417T091251Z&X-Amz-Expires=3600&X-Amz-Signature=7a775f2df98ecaf6e076f61ee4430562ccbaff49260bf285e3c5697a8296bda7&X-Amz-SignedHeaders=host&x-id=GetObject", // correct track
        targetTrack: "https://p.scdn.co/mp3-preview/a4a01df37485be89e116bc11a22405259c35272a?cid=a5d89672a835486c952dddf93dba44b3"
    });
    console.log(response);
};

start();

