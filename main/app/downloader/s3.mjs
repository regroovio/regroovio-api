// s3.mjs

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

const saveAlbumToS3 = async (item) => {
    const { stream, name, album, artist } = item;
    const s3 = new S3Client({ region: 'us-east-1' });
    const bucketName = `albums-regroovio`;
    const type = "mp3";
    try {
        const response = await axios.get(stream, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const key = `artists/${encodeURIComponent(artist)}/${encodeURIComponent(album)}/${encodeURIComponent(name)}.${type}`;
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: response.headers['content-type'],
        };
        await s3.send(new PutObjectCommand(params));
        console.log(`Saved track to S3: ${params.Key}`);
        const id = Buffer.from(params.Key, 'base64').toString('utf-8');
        const decodedStr = Buffer.from(id, 'base64').toString('utf-8');
        console.log(id);
        console.log(decodedStr);
        return id;
    } catch (err) {
        console.error(`Error saving album to S3: ${err}`);
        return null;
    }
};

const saveImageToS3 = async (item) => {
    const { imageUrl, album, artist } = item;
    const s3 = new S3Client({ region: 'us-east-1' });
    const bucketName = `albums-regroovio`;
    const type = "jpg";
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const key = `artists/${encodeURIComponent(artist)}/${encodeURIComponent(album)}/image.${type}`;
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: response.headers['content-type'],
        };
        await s3.send(new PutObjectCommand(params));
        console.log(`Saved image to S3: ${params.Key}`);
        const id = Buffer.from(params.Key, 'base64').toString('utf-8');
        const decodedStr = Buffer.from(id, 'base64').toString('utf-8');
        console.log(id);
        console.log(decodedStr);
        return id;
    } catch (err) {
        console.error(`Error saving image to S3: ${err}`);
        return null;
    }
};

export { saveAlbumToS3, saveImageToS3 };
