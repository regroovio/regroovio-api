// dynamo.mjs 

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { AWS_DYNAMO } from "./config.mjs";

const dynamodb = new DynamoDB(AWS_DYNAMO);
const documentClient = DynamoDBDocument.from(new DynamoDB(AWS_DYNAMO));

export { dynamodb, documentClient };
