// s3.mjs

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { createHash } from "crypto";

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
        const id = createHash("sha256").update(params.Key).digest("hex");
        // unhashed the id and log it to the console
        const unhashedId = Buffer.from(id, 'hex').toString('utf8');
        console.log(unhashedId);
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
        const id = createHash("sha256").update(params.Key).digest("hex");
        // unhashed the id and log it to the console
        const unhashedId = Buffer.from(id, 'hex').toString('utf8');
        console.log(unhashedId);
        return id;
    } catch (err) {
        console.error(`Error saving image to S3: ${err}`);
        return null;
    }
};

export { saveAlbumToS3, saveImageToS3 };
