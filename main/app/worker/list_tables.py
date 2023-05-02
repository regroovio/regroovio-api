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
dynamodb_client = boto3.client('dynamodb', **AWS_DYNAMO)


def list_tables():
    try:
        result = None
        tables = []
        params = {}
        while True:
            result = dynamodb_client.list_tables(**params)
            tables.extend(
                [name for name in result["TableNames"]
                    if "regroovio" in name and "users" not in name]
            )
            if "LastEvaluatedTableName" in result:
                params["ExclusiveStartTableName"] = result["LastEvaluatedTableName"]
            else:
                break
        return tables
    except ClientError as err:
        print(f"Error listing tables: {err}")
        return []
