import os
import json
import boto3
import librosa
import requests
import numpy as np
import librosa.display
from io import BytesIO
from datetime import datetime
from dotenv import load_dotenv
from scipy.spatial.distance import cosine
from botocore.exceptions import ClientError
from sklearn.preprocessing import StandardScaler
load_dotenv()

AWS_DYNAMO = {
    'region_name': os.getenv('REGION'),
    'aws_access_key_id': os.getenv('ACCESS_KEY'),
    'aws_secret_access_key': os.getenv('SECRET_ACCESS_KEY'),
}

s3 = boto3.client('s3', region_name='us-east-1')
lambda_client = boto3.client('lambda', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', **AWS_DYNAMO)
dynamodb_client = boto3.client('dynamodb', **AWS_DYNAMO)


def app(table):
    try:
        print(f"Getting {table}...")
        bandcamp_tables = list_bandcamp_tables(table)
        for table_name in bandcamp_tables:
            print(f"Retrieving unsaved albums from {table_name}")
            unsaved_albums = fetch_unsaved_albums(table_name)
            if not unsaved_albums:
                print({"message": "No unsaved albums found."})
            else:
                print(f"Found {len(unsaved_albums)} unsaved albums.")
                invoke_lambdas_in_chunks(
                    f"bandcamp-worker-downloader-{os.getenv('STAGE')}", unsaved_albums, table_name
                )
            print(f"Retrieving unprocessed albums from {table_name}")
            unprocessed_albums = fetch_unprocessed_albums(table_name)
            if not unprocessed_albums:
                print({"message": "No unprocessed albums found."})
                return
            admin_id = os.getenv('ADMIN_ID')
            admin = get_user_by_id(admin_id)
            if not admin:
                print("User not found")
                return
            token = admin.get('access_token_spotify') or None
            remaining_time_in_minutes = (
                float(admin['expiration_timestamp_spotify'] / 1000) - datetime.now().timestamp()) / 60
            minutes = str(int(remaining_time_in_minutes))
            print(
                f"Token expires in: {minutes} minutes" if minutes != "NaN" or -15 else "Token is expired")
            if remaining_time_in_minutes <= 15 or minutes == "NaN":
                print("refreshing token...")
                raw_tokens = invoke_lambda({
                    "FunctionName": f"spotify-token-{os.getenv('STAGE')}",
                    "Payload": json.dumps({"user_id": admin_id}),
                })
                tokens = json.loads(raw_tokens)
                update_user_tokens(admin, tokens)
                token = tokens['access_token']
            print(f"Found {len(unprocessed_albums)} unprocessed albums.")
            recognize_tracks = []
            for i, album in enumerate(unprocessed_albums):
                print(f"Searching {i + 1} of {len(unprocessed_albums)}")
                for track in album['tracks']:
                    params = {
                        "Bucket": "albums-regroovio",
                        "Key": track['key'],
                    }
                    source_track_url = s3.generate_presigned_url(
                        "get_object", Params=params, ExpiresIn=60 * 60
                    )
                    track["release_year"] = album["release_date"].split(
                        " ")[2] if album.get("release_date") else None
                    track["sourceTrackUrl"] = source_track_url
                    target_track = invoke_lambda(
                        {
                            "FunctionName": f"spotify-search-track-{os.getenv('STAGE')}",
                            "Payload": json.dumps(
                                {
                                    "token": token,
                                    "trackName": track["name"],
                                    "albumName": track["album"],
                                    "artistName": album["artist_name"],
                                    "year": track["release_year"],
                                }
                            ),
                        }
                    )
                    parsed_target_track = json.loads(target_track)
                    if parsed_target_track.get("statusCode") == 404:
                        print(f"Track not found: {track['name']}")
                        print({"track": track})
                        recognize_tracks.append(track)
                    else:
                        target_track_info = parsed_target_track["body"]
                        similarity_percentage = compare_audio_files(
                            track["sourceTrackUrl"], target_track_info["preview_url"])
                        print('')
                        print(f"Track found: {track['name']}")
                        print(f"Score: {similarity_percentage:.2f}%")
                        print(track['sourceTrackUrl'])
                        print(target_track_info['preview_url'])
        i += 1
        response = {
            "functionName": f"bandcamp-cron-processor-{os.getenv('STAGE')}",
            "status": "Success",
            "message": f"Table {table} saved.",
        }
        return response
    except Exception as error:
        response = {"functionName": table,
                    "status": "Error", "message": str(error)}
        raise Exception(f"Failed to process albums: {response}")


def list_bandcamp_tables(table):
    try:
        result = None
        bandcamp_tables = []
        params = {}
        while True:
            result = dynamodb_client.list_tables(**params)
            bandcamp_tables.extend(
                [name for name in result["TableNames"] if table in name]
            )
            if "LastEvaluatedTableName" in result:
                params["ExclusiveStartTableName"] = result["LastEvaluatedTableName"]
            else:
                break
        return bandcamp_tables
    except ClientError as err:
        print(f"Error listing Bandcamp tables: {err}")
        return []


def invoke_lambdas_in_chunks(function_name, albums, table_name, token=None):
    chunk_size = 10
    if len(albums) < chunk_size:
        chunk_size = len(albums)
    for i in range(0, len(albums), chunk_size):
        chunk = albums[i: i + chunk_size]
        print(
            f"Downloading chunk {i // chunk_size + 1} of {len(albums) // chunk_size}")
        for album in chunk:
            invoke_lambda(
                {
                    "FunctionName": function_name,
                    "Payload": json.dumps(
                        {
                            "tableName": table_name,
                            "album": album,
                            "token": token if token else None,
                        }
                    ),
                }
            )


def invoke_lambda(params):
    try:
        response = lambda_client.invoke(**params)
        payload = response["Payload"].read().decode("utf-8")
        cleaned_payload = json.loads(payload.strip('"'))
        return cleaned_payload["body"]
    except ClientError as error:
        print("Error invoking Lambda function:", error)


def fetch_unsaved_albums(table_name):
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
        unsaved_albums = [
            album for album in items if not album.get("saved", False)]
        return unsaved_albums
    except ClientError as err:
        print(f"Error fetching unsaved albums: {err}")
        return []


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
            album for album in items if not album.get("processed")]
        return unprocessed_albums
    except ClientError as err:
        print(f"Error fetching unprocessed albums: {err}")
        return []


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


def update_user_tokens(user, tokens):
    try:
        table = dynamodb.Table(f"users-{os.getenv('STAGE')}")
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


def load_audio_file(url):
    response = requests.get(url)
    return BytesIO(response.content)


def compare_audio_files(source_track_url, target_track_url):
    source_audio_data = load_audio_file(source_track_url)
    target_audio_data = load_audio_file(target_track_url)
    source_audio, source_sr = librosa.load(
        source_audio_data, sr=None, mono=True)
    target_audio, target_sr = librosa.load(
        target_audio_data, sr=None, mono=True)
    if source_sr != target_sr:
        target_sr = max(source_sr, target_sr)
        source_audio = librosa.resample(source_audio, source_sr, target_sr)
        target_audio = librosa.resample(target_audio, target_sr, target_sr)
    min_len = min(source_audio.shape[0], target_audio.shape[0])
    source_audio = source_audio[:min_len]
    target_audio = target_audio[:min_len]

    source_features = extract_audio_features(source_audio, target_sr)
    target_features = extract_audio_features(target_audio, target_sr)
    source_features_norm = normalize_audio_features(source_features)
    target_features_norm = normalize_audio_features(target_features)
    similarity = 1 - cosine(source_features_norm.T.flatten(),
                            target_features_norm.T.flatten())
    return similarity * 100


def extract_audio_features(audio, sr):
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=20)
    chroma = librosa.feature.chroma_stft(y=audio, sr=sr)
    spectral_contrast = librosa.feature.spectral_contrast(y=audio, sr=sr)
    tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(audio), sr=sr)
    return np.concatenate((mfcc, chroma, spectral_contrast, tonnetz))


def normalize_audio_features(features):
    scaler = StandardScaler()
    return scaler.fit_transform(features)


# For testing the compare_audio_files funciton
source_track_url = "https://albums-regroovio.s3.amazonaws.com/bandcamp/Napoleon%20Da%20Legend/Le%20Dernier%20Glacier/Hypothermie%20ft.%20DJ%20Djel.mp3?AWSAccessKeyId=AKIATFEQG44VPLHDH73Z&Signature=sHv5Wpj1NzHg18jWfePrBwPAiyw%3D&Expires=1681837244"
target_track_url = "https://albums-regroovio.s3.amazonaws.com/bandcamp/Napoleon%20Da%20Legend/Le%20Dernier%20Glacier/Bureau%20des%20L%C3%A9gendes%20ft.%20Dany%20Dan%20%26%20Tiwony.mp3?AWSAccessKeyId=AKIATFEQG44VPLHDH73Z&Signature=mS348PPWSQDTdM%2BQW%2FlGu%2BE7%2Bjc%3D&Expires=1681837253"
similarity = compare_audio_files(source_track_url, target_track_url)
print(similarity)

# app('daily')
