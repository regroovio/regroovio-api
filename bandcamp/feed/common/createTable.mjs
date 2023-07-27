// createTable.mjs 

import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDBClient({ region: process.env.REGION });

const createTable = async (TableName) => {
    const params = {
        AttributeDefinitions: [
            {
                AttributeName: "album_id",
                AttributeType: "S",
            },
        ],
        KeySchema: [
            {
                AttributeName: "album_id",
                KeyType: "HASH",
            },
        ],
        BillingMode: "PAY_PER_REQUEST",
        TableName,
    };

    try {
        await dynamodb.send(new CreateTableCommand(params));
        console.log(`Created DynamoDB table: ${TableName}`);
    } catch (err) {
        if (err.name !== "ResourceInUseException") {
            console.log(`Error creating DynamoDB table: ${err.message}`);
            throw err;
        }
    }
};

export { createTable };
