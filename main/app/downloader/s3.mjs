// s3.mjs

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

const saveToS3 = async (url, artist, album, name, type) => {
    const s3 = new S3Client({ region: 'us-east-1' });
    const bucketName = `albums-regroovio`;
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const params = {
            Bucket: bucketName,
            Key: `artists/${encodeURIComponent(artist)}/${encodeURIComponent(album)}/${encodeURIComponent(name)}.${type}`,
            Body: buffer,
            ContentType: response.headers['content-type']
        };
        await s3.send(new PutObjectCommand(params));
        const savedUrl = `https://${bucketName}.s3.amazonaws.com/${params.Key}`
        console.log(`Saved ${type} to S3: ${savedUrl}`);
        return savedUrl;
    } catch (err) {
        console.error(`Error saving ${type} to S3: ${err}`);
        return null;
    }
};

const saveAlbumToS3 = async (item) => {
    const { stream, name, album, artist } = item;
    return await saveToS3(stream, artist, album, name, 'mp3');
};

const saveImageToS3 = async (item) => {
    const { imageUrl, album, artist } = item;
    return await saveToS3(imageUrl, artist, album, album, 'jpg');
};

export { saveAlbumToS3, saveImageToS3 };
