// addAlbumsToDb.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const dynamoClient = new DynamoDB(AWS_DYNAMO);

const getAlbumData = async (table, album_id) => {
    const params = {
        TableName: table,
        Key: {
            album_id: { S: album_id },
        },
    };

    try {
        const response = await dynamoClient.getItem(params);
        return response.Item;
    } catch (error) {
        console.log(error);
        return null;
    }
};

const addAlbumsToDb = async (table, links, user_id) => {
    const chunkSize = links.length;
    for (let i = 0; i < links.length; i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);
        console.log(`Uploading`);
        await Promise.all(chunk.map(async (link) => {
            const album_id = link?.split("?")[0] ? link.split("?")[0] : link;
            let albumData = await getAlbumData(table, album_id);

            if (albumData) {
                if (!albumData.user_ids.L.some((id) => id.S === user_id)) {
                    albumData.user_ids.L.push({ S: user_id });
                }
            } else {
                albumData = {
                    album_id: { S: album_id },
                    user_ids: { L: [{ S: user_id }] },
                };
            }

            const params = {
                TableName: table,
                Item: albumData,
            };

            try {
                await dynamoClient.putItem(params);
            } catch (error) {
                console.log(error);
            }
        }));
    }
};

export { addAlbumsToDb };
