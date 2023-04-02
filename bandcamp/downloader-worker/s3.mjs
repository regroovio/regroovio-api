// s3.mjs

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

const saveAlbumToS3 = async (item) => {
    const { stream, name, album, artist } = item;
    const region = 'us-east-1';
    const s3 = new S3Client({ region });
    const bucketName = `albums-regroovio-${process.env.STAGE}`;
    const type = "mp3";
    try {
        const response = await axios.get(stream, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const key = `bandcamp/${artist.replace('/', '-')}/${album.replace('/', '-')}/${name.replace('/', '-')}.${type}`;
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: response.headers['content-type']
        };
        const res = await s3.send(new PutObjectCommand(params));
        console.log(res);
        // return url of the album
    } catch (err) {
        console.error(`Error saving album to S3: ${err}`);
        return null;
    }
};

const saveImageToS3 = async (item) => {
    const { imageUrl, album, artist } = item;
    const region = 'us-east-1';
    const s3 = new S3Client({ region });
    const bucketName = `albums-regroovio-${process.env.STAGE}`;
    const type = "jpg";
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const key = `bandcamp/${artist.replace('/', '-')}/${album.replace('/', '-')}/${album.replace('/', '-')}.${type}`;
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: response.headers['content-type']
        };
        const res = await s3.send(new PutObjectCommand(params));
        console.log(res);
        // return url of the image
    } catch (err) {
        console.error(`Error saving image to S3: ${err}`);
        return null;
    }
};

export { saveAlbumToS3, saveImageToS3 };