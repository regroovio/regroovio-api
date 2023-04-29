import json
import boto3
from dotenv import load_dotenv
from botocore.exceptions import ClientError
load_dotenv()

lambda_client = boto3.client('lambda', region_name='us-east-1')


def invoke_lambda(params):
    try:
        response = lambda_client.invoke(**params)
        payload = response["Payload"].read().decode("utf-8")
        cleaned_payload = json.loads(payload.strip('"'))
        if "body" in cleaned_payload:
            return cleaned_payload["body"]
        else:
            raise ValueError(cleaned_payload)
    except ClientError as error:
        print("Error invoking Lambda function:", error)
