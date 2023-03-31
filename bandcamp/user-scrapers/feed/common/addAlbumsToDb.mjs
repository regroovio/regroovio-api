// addAlbumsToDb.mjs

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const dynamoClient = new DynamoDB(AWS_DYNAMO);

const getAlbumData = async (table, albumId) => {
    const params = {
        TableName: table,
        Key: {
            id: { S: albumId },
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
    for (const link of links) {
        const id = link?.split("?")[0] ? link.split("?")[0] : link;
        let albumData = await getAlbumData(table, id);

        if (albumData) {
            if (!albumData.user_ids.L.some((id) => id.S === user_id)) {
                albumData.user_ids.L.push({ S: user_id });
            }
        } else {
            albumData = {
                id: { S: id },
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
    }
};

export { addAlbumsToDb };
