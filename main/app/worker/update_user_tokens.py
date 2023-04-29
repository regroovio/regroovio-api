import os
import boto3
from dotenv import load_dotenv
from botocore.exceptions import ClientError
load_dotenv()

AWS_DYNAMO = {
    'region_name': os.getenv('REGION'),
    'aws_access_key_id': os.getenv('ACCESS_KEY'),
    'aws_secret_access_key': os.getenv('SECRET_ACCESS_KEY'),
}

dynamodb = boto3.resource('dynamodb', **AWS_DYNAMO)


def update_user_tokens(user, tokens):
    try:
        table = dynamodb.Table(f"regroovio-users-{os.getenv('STAGE')}")
        table.update_item(
            Key={"user_id": user["user_id"]},
            UpdateExpression="set access_token_spotify = :at, expiration_timestamp_spotify = :et",
            ExpressionAttributeValues={
                ":at": tokens["access_token"],
                ":et": tokens["expiration_timestamp"],
            },
            ReturnValues="UPDATED_NEW",
        )
    except ClientError as err:
        print(f"Error updating user tokens: {err}")
        return None
