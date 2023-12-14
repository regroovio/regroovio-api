// secretHash.mjs

import crypto from "crypto";

const calculateSecretHash = (username, clientId, clientSecret) => {
    const hmac = crypto.createHmac("sha256", clientSecret);
    hmac.update(username + clientId);
    return hmac.digest("base64");
};

export default calculateSecretHash;