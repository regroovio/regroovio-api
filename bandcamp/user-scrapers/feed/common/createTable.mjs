// createTable.mjs 

import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const dynamodb = new DynamoDBClient(AWS_DYNAMO);

const createTable = async (TableName) => {
    const params = {
        AttributeDefinitions: [
            {
                AttributeName: "id",
                AttributeType: "S",
            },
        ],
        KeySchema: [
            {
                AttributeName: "id",
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
            console.error(`Error creating DynamoDB table: ${err.message}`);
            throw err;
        }
    }
};

export { createTable };
