import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo_db = new DynamoDB({ region: process.env.REGION });
const document_client = DynamoDBDocument.from(dynamo_db);

const getRandomImages = async (req, res) => {
  try {
    const minPopularity = req.query.minPopularity || 0;
    const bandcampTables = await fetchBandcampTables();
    const allImageUrls = await Promise.all(bandcampTables.map(tableName => fetchAndExtractImageUrls(tableName, minPopularity)));
    return allImageUrls.flat();
  } catch (err) {
    console.error('Error processing albums:', err);
    throw new Error('Failed to process albums');
  }
};

const fetchBandcampTables = async () => {
  let params = {};
  let bandcampTables = [];
  let result;

  do {
    result = await dynamo_db.listTables(params);
    bandcampTables.push(...result.TableNames.filter(name => !name.includes("regroovio-users") && name.includes(process.env.STAGE)));
    params.ExclusiveStartTableName = result.LastEvaluatedTableName;
  } while (result.LastEvaluatedTableName);

  return bandcampTables;
};

const fetchAndExtractImageUrls = async (tableName, minPopularity) => {
  const albums = await fetchAlbums(tableName, minPopularity);
  return extractImageUrls(albums);
};

const fetchAlbums = async (tableName, minPopularity) => {
  const params = {
    TableName: tableName,
    FilterExpression: "popularity >= :minPopularity",
    ExpressionAttributeValues: {
      ":minPopularity": minPopularity
    },
    ScanIndexForward: false,
    Limit: 50
  };
  return (await document_client.scan(params)).Items;
};

const extractImageUrls = (albums) => {
  return albums.map(albumItem => albumItem.image).filter(Boolean);
};

export { getRandomImages };
