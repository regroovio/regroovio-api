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


def update_album_in_dynamodb(table_name, album_id, updated_tracks):
    try:
        table = dynamodb.Table(table_name)
        response = table.update_item(
            Key={
                'album_id': album_id
            },
            UpdateExpression="set tracks = :t",
            ExpressionAttributeValues={
                ':t': updated_tracks
            },
            ReturnValues="UPDATED_NEW"
        )
        return response
    except ClientError as err:
        print(f"Error fetching unprocessed albums: {err}")
        return []
