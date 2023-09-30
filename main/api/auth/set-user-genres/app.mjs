// add-user-genres/app.mjs

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const app = async (event, context) => {
    console.log(event);
    const { user_id, genres } = event.body ? JSON.parse(event.body) : event;
    if (user_id && genres) {
        try {
            await setUserGenresInDB(user_id, genres);
            return { message: "Genres updated successfully", statusCode: 200 };
        } catch (error) {
            console.error('Error setting user genres in DynamoDB: ', error);
            return { message: error.message, statusCode: 400 };
        }
    } else {
        console.error('User ID or genres not provided');
        return { message: 'User ID or genres not provided', statusCode: 400 };
    }
};

const setUserGenresInDB = async (user_id, genres) => {
    const params = {
        TableName: `regroovio-users-${process.env.STAGE}`,
        Key: {
            user_id: user_id
        },
        UpdateExpression: "set genres = :g",
        ExpressionAttributeValues: {
            ":g": genres
        }
    };
    try {
        await documentClient.update(params);
    } catch (error) {
        console.error('Error setting user genres in DynamoDB: ', error);
        throw error;
    }
};

export { app };
