// getUserById.mjs 

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const getUserById = async (user_id) => {
    try {
        const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));
        const params = {
            TableName: `regroovio-users-${process.env.STAGE}`,
            Key: {
                user_id: user_id,
            },
        };
        const users = await documentClient.scan(params);
        if (users.Items.length === 0) {
            throw new Error(`No user with id ${user_id} found`);
        }
        return users.Items.find(item => item.user_id === user_id);
    } catch (err) {
        console.log(`Error getUserById: ${err}`);
        throw err;
    }
};
export { getUserById };
