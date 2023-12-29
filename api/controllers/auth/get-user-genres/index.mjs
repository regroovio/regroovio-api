import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import loadEnvironmentVariables from "../../../helpers/environment.js";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const getGenres = async (req, res) => {
  const { user_id } = req.body;
  await loadEnvironmentVariables();
  try {
    const userGenres = await fetchUserGenresFromDB(user_id);
    return { data: userGenres, statusCode: 200 };
  } catch (error) {
    console.error('Error fetching user genres from DynamoDB: ', error);
    return { message: error.message, statusCode: 400 };
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

export { getGenres };
