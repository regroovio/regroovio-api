// dynamo.mjs

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const documentClient = DynamoDBDocument.from(new DynamoDB());

export { documentClient };