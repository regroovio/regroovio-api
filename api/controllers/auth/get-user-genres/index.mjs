import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const app = async (event, context) => {
  console.log(event);
  const { user_id } = event.body ? JSON.parse(event.body) : event;
  if (user_id) {
    try {
      const userGenres = await fetchUserGenresFromDB(user_id);
      return { data: userGenres, statusCode: 200 };
    } catch (error) {
      console.error('Error fetching user genres from DynamoDB: ', error);
      return { message: error.message, statusCode: 400 };
    }
  } else {
    console.error('User ID not provided');
    return { message: 'User ID not provided', statusCode: 400 };

  }
};

const fetchUserGenresFromDB = async (user_id) => {
  const params = {
    TableName: `regroovio-users-${process.env.STAGE}`,
    Key: {
      user_id: user_id
    }
  };
  try {
    const result = await documentClient.get(params);
    const genres = result.Item.genres ? result.Item.genres : [];
    return genres;
  } catch (error) {
    console.error('Error fetching user genres from DynamoDB: ', error);
    throw error;
  }
};

export { app };
