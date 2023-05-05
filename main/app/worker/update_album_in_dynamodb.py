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


def update_album_in_dynamodb(table_name, album):

    try:
        p = 'true'
        table = dynamodb.Table(table_name)
        for track in album['tracks']:
            if track['spotify'] is None:
                p = 'failed'

        response = table.update_item(
            Key={
                'album_id': album['album_id']
            },
            UpdateExpression="set tracks=:t, #pr=:p",
            ExpressionAttributeValues={
                ':t': album['tracks'],
                ':p': p
            },
            ExpressionAttributeNames={
                "#pr": "processed"
            },
            ReturnValues="UPDATED_NEW"
        )
        return response
    except ClientError as err:
        print(f"Error updating album in DynamoDB: {err}")
        return None
