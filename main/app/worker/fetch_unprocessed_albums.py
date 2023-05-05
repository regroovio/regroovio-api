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


def fetch_unprocessed_albums(table_name):
    try:
        table = dynamodb.Table(table_name)
        items = []
        last_evaluated_key = None
        while True:
            if last_evaluated_key:
                response = table.scan(
                    Limit=100, ExclusiveStartKey=last_evaluated_key
                )
            else:
                response = table.scan(
                    Limit=100
                )
            items.extend(response["Items"])
            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break
        unprocessed_albums = [
            album for album in items if album.get("saved") and not album.get("processed") == 'true']
        return unprocessed_albums
    except ClientError as err:
        print(f"Error fetching unprocessed albums: {err}")
        return []
