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
        const params = {
            Bucket: bucketName,
            Key: `artists/${artist}/${album}/${name}.${type}`,
            Body: buffer,
            ContentType: response.headers['content-type'],
            ACL: 'public-read'
        };
        await s3.send(new PutObjectCommand(params));
        const key = params.Key.split(' ').join('+');
        const track = `https://${bucketName}.s3.amazonaws.com/${key}`
        console.log(`Saved track to S3: ${track}`);
        return { url: track, name };
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
        const params = {
            Bucket: bucketName,
            Key: `artists/${artist}/${album}/image.${type}`,
            Body: buffer,
            ContentType: response.headers['content-type'],
            ACL: 'public-read'
        };
        await s3.send(new PutObjectCommand(params));
        const key = params.Key.split(' ').join('+');
        const image = `https://${bucketName}.s3.amazonaws.com/${key}`
        console.log(`Saved image to S3: ${image}`);
        return image;
    } catch (err) {
        console.error(`Error saving image to S3: ${err}`);
        return null;
    }
};

export { saveAlbumToS3, saveImageToS3 };
