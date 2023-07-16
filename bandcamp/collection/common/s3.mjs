import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

const client = new S3Client({ region: 'us-east-1' });
const bucketName = `regroovio-albums`;

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

    await client.send(command);

    const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
    const s3ObjectUrl = `https://${bucketName}.s3.us-east-1.amazonaws.com/${encodedKey}`;
    return s3ObjectUrl;
}

const saveTrackToS3 = async (item) => {
    const { stream, name, album, artist } = item;
    const type = "mp3";
    const key = `artists/${artist}/${album}/${name}.${type}`;

    const { data } = await axios.get(stream, { responseType: 'arraybuffer' });
    return await saveToS3(key, data, 'audio/mpeg');
};

const saveImageToS3 = async (item) => {
    const { imageUrl, album, artist } = item;
    const type = "jpg";
    const key = `artists/${artist}/${album}/image.${type}`;

    const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    return await saveToS3(key, data, 'image/jpeg');
};

export { saveTrackToS3, saveImageToS3 };
