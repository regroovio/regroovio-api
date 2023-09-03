// post-verify-email/app.mjs

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const app = async (event, context) => {
    console.log(event);

    const { userAttributes } = event.request || event;
    const { sub, email, preferred_username: username } = userAttributes;

    if (email && username) {
        console.log('sub: ', sub);
        console.log('email: ', email);
        console.log('username: ', username);

        const params = {
            TableName: `users-${process.env.STAGE}`,
            Item: {
                userId: sub,
                email,
                username
            }
        };

        try {
            await documentClient.put(params)
            console.log('User added to DynamoDB');
            context.succeed(event);
        } catch (error) {
            console.error('Error adding user to DynamoDB: ', error);
            context.fail('Error adding user to DynamoDB');
        }
    } else {
        console.error('Invalid email or username');
        context.fail('Invalid email or username');
    }
};

export { app };