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


def get_user_by_id(user_id):
    try:
        table = dynamodb.Table(f"users-{os.getenv('STAGE')}")
        items = []
        last_evaluated_key = None
        while True:
            if last_evaluated_key:
                response = table.scan(ExclusiveStartKey=last_evaluated_key)
            else:
                response = table.scan()
            items.extend(response["Items"])
            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break
        for item in items:
            if item["user_id"] == user_id:
                return item
        return None
    except ClientError as err:
        print(f"Error getting user by id: {err}")
        return None
