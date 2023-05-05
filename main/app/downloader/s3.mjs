// s3.mjs

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

const sanitizeKey = (key) => {
    return key.replace(/\s+/g, '+');
};

const saveAlbumToS3 = async (item) => {
    const { stream, name, album, artist } = item;
    const s3 = new S3Client({ region: 'us-east-1' });
    const bucketName = `albums-regroovio`;
    const type = "mp3";
    try {
        const response = await axios.get(stream, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const key = sanitizeKey(`artists/${artist}/${album}/${name}.${type}`);
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: response.headers['content-type'],
        };
        const putObjectResponse = await s3.send(new PutObjectCommand(params));
        console.log(putObjectResponse);
        const track = putObjectResponse.Location;
        console.log(`Saved track to S3: ${track}`);
        return track;
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
        const key = sanitizeKey(`artists/${artist}/${album}/image.${type}`);
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: response.headers['content-type'],
        };
        const putObjectResponse = await s3.send(new PutObjectCommand(params));
        console.log(putObjectResponse);
        const image = putObjectResponse.Location;
        console.log(`Saved image to S3: ${image}`);
        return image;
    } catch (err) {
        console.error(`Error saving image to S3: ${err}`);
        return null;
    }
};

export { saveAlbumToS3, saveImageToS3 };
