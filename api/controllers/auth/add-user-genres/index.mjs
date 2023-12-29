import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import loadEnvironmentVariables from "../../../helpers/environment.js";

const documentClient = DynamoDBDocument.from(new DynamoDB({ region: process.env.REGION }));

const addGenres = async (req, res) => {
  const { user_id, genres } = req.body;
  await loadEnvironmentVariables();
  try {
    await setUserGenresInDB(user_id, genres);
    return { message: "Genres updated successfully", statusCode: 200 };
  } catch (error) {
    console.error('Error setting user genres in DynamoDB: ', error);
    return { message: error.message, statusCode: 400 };
  }
};

const setUserGenresInDB = async (user_id, genres) => {
  const params = {
    TableName: `regroovio-users-${process.env.STAGE}`,
    Key: {
      user_id: user_id
    },
    UpdateExpression: "set genres = :g",
    ExpressionAttributeValues: {
      ":g": genres
    }
  };
  try {
    await documentClient.update(params);
  } catch (error) {
    console.error('Error setting user genres in DynamoDB: ', error);
    throw error;
  }
};

export { addGenres };
