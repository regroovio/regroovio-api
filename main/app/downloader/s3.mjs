import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import axios from 'axios';

const client = new S3Client({ region: 'us-east-1' });
const bucketName = `regroovio-albums`;

function encodeS3ObjectKey(key) {
    return key
        .split('/')
        .map((part) => encodeURIComponent(part).replace(/%2F/g, '/'))
        .join('/');
}

const saveToS3 = async (key, data, contentType) => {
    const buffer = Buffer.from(data, 'binary');
    const input = {
        Bucket: bucketName,
        Key: key,
        Expires: new Date(),
        Body: buffer,
        ContentType: contentType,
    };
    const command = new PutObjectCommand(input);
    const response = await client.send(command);
    const encodedKey = encodeS3ObjectKey(key);
    const s3ObjectUrl = `https://${bucketName}.s3.us-east-1.amazonaws.com/${encodedKey}`;
    return s3ObjectUrl;
}

const saveTrackToS3 = async (item) => {
    const { stream, name, album, artist } = item;
    const type = "mp3";
    const key = `artists/${artist}/${album}/${name}.${type}`;
    try {
        const { data } = await axios.get(stream, { responseType: 'arraybuffer' });
        const s3ObjectUrl = await saveToS3(key, data, 'audio/mpeg');
        console.log(`Saved track to S3: ${s3ObjectUrl}`);
        return s3ObjectUrl;
    } catch (err) {
        console.error(`Error saving album to S3: ${err}`);
        return null;
    }
};

const saveImageToS3 = async (item) => {
    const { imageUrl, album, artist } = item;
    const type = "jpg";
    const key = `artists/${artist}/${album}/image.${type}`;
    try {
        const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const s3ObjectUrl = await saveToS3(key, data, 'image/jpeg');
        console.log(`Saved image to S3: ${s3ObjectUrl}`);
        return s3ObjectUrl;
    } catch (err) {
        console.error(`Error saving image to S3: ${err}`);
        return null;
    }
};

export { saveTrackToS3, saveImageToS3 };
