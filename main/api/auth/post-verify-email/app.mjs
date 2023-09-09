// post-verify-email/app.mjs

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const app = async (event, context) => {
    console.log(event);
    const { userAttributes } = event.request || event;
    const { sub, email, preferred_username: username } = userAttributes;

    if (email && username) {
        console.log('sub: ', sub, 'email: ', email, 'username: ', username);
        const success = await addUserToDB({ sub, email, username });
        if (success) {
            context.succeed(event);
            return event;
        } else {
            context.fail('Error adding user to DynamoDB');
        }
    } else {
        console.error('Invalid email or username');
        context.fail('Invalid email or username');
    }
};

const addUserToDB = async ({ sub, email, username }) => {
    const params = {
        TableName: `regroovio-users-${process.env.STAGE}`,
        Item: {
            userId: sub,
            email,
            username
        }
    };
    try {
        await documentClient.put(params);
        console.log('User added to DynamoDB');
        return true;
    } catch (error) {
        console.error('Error adding user to DynamoDB: ', error);
        return false;
    }
};

export { app };
