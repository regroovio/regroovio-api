import os
import json
import time
import boto3
from decimal import Decimal
from datetime import datetime
from dotenv import load_dotenv

import list_tables
import fetch_unprocessed_albums
import invoke_lambda
import get_user_by_id
import update_user_tokens
import update_album_in_dynamodb

load_dotenv()
s3 = boto3.client('s3', region_name='us-east-1')

# Check every 30 seconds
CHECK_INTERVAL = 5


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def check_and_update_token_if_expired(admin_id, admin):
    if admin is None:
        raise ValueError("Admin not found")

    token = admin.get('access_token_spotify') or None
    remaining_time_in_minutes = (
        float(admin['expiration_timestamp_spotify'] / 1000) - datetime.now().timestamp()) / 60 if 'expiration_timestamp_spotify' in admin else -1
    minutes = int(remaining_time_in_minutes)
    if minutes <= 15:
        print("getting token...")
        raw_tokens = invoke_lambda.invoke_lambda({
            "FunctionName": f"spotify-scrap-token-{os.getenv('STAGE')}",
            "Payload": json.dumps({"user_id": admin_id}),
        })
        tokens = json.loads(raw_tokens)
        if tokens.get('access_token'):
            admin = update_user_tokens.update_user_tokens(
                admin, tokens)
            return admin
    return admin


def process_unprocessed_albums(admin_id, admin, unprocessed_albums, table_name):
    if not unprocessed_albums:
        return False
    for i, album in enumerate(unprocessed_albums):
        new_admin = check_and_update_token_if_expired(admin_id, admin)
        if new_admin is not None:
            admin = new_admin

        token = admin['access_token_spotify']
        if token is None:
            print("Error: Token not found")
            return
        print(
            f"\nSearching: {album['artist_name']} - {album['album_name']} [{i + 1}/{len(unprocessed_albums)}]")
        for track in album['tracks']:
            print("")
            print(track)
            track = process_track(token, track, album)

        for track in album['tracks']:
            print("")
            print(track)
            if track['spotify'] is not None:
                return update_album_in_dynamodb.update_album_in_dynamodb(table_name, album)


def process_track(token, track, album):
    track["release_year"] = album["release_date"].split(
        "-")[2] if album.get("release_date") else None
    print(track["name"])
    target_track = invoke_lambda.invoke_lambda(
        {
            "FunctionName": f"spotify-search-track-{os.getenv('STAGE')}",
            "Payload": json.dumps(
                {
                    "token": token,
                    "trackName": track["name"],
                    "albumName": album["album_name"],
                    "artistName": album["artist_name"],
                    "year": track["release_year"],
                },
                cls=DecimalEncoder,
            ),
        }
    )
    parsed_target_track = json.loads(target_track)
    track["spotify"] = handle_track_search_response(
        parsed_target_track, token, track, album)

    return track


def handle_track_search_response(parsed_target_track, token, track, album):
    if parsed_target_track.get("statusCode") == 404:
        print(f"\nTrack not found: {track['name']}")
        time.sleep(3)
        recognizer_response = invoke_lambda.invoke_lambda(
            {
                "FunctionName": f"regroovio-recognizer-{os.getenv('STAGE')}",
                "Payload": json.dumps(
                    {
                        "token": token,
                        "track": track,
                    },
                    cls=DecimalEncoder,
                ),
            }
        )
        parsed_recognizer_response = json.loads(recognizer_response)
        recognizer_response_info = parsed_recognizer_response["body"]

        if recognizer_response_info is not None and "id" in recognizer_response_info:
            print(f"\nTrack recognized", recognizer_response_info["name"])
            del recognizer_response_info["album"]
            del recognizer_response_info["is_playable"]
            del recognizer_response_info["linked_from"]
            del recognizer_response_info["available_markets"]
            del recognizer_response_info["disc_number"]
            del recognizer_response_info["explicit"]
            del recognizer_response_info["external_urls"]
            del recognizer_response_info["preview_url"]
            del recognizer_response_info["external_ids"]
            track["spotify"] = recognizer_response_info
        else:
            print(f"\nTrack not recognized", track["name"])
            track["spotify"] = recognizer_response_info
            dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
            table = dynamodb.Table(
                f"regroovio-missing-tracks-{os.getenv('STAGE')}")
            item = {
                'track_id': track['url'],
                'album_id': album['album_id']
            }
            table.put_item(Item=item)

    else:
        target_track_info = parsed_target_track["body"]
        if isinstance(target_track_info, dict):
            del target_track_info["album"]
            del target_track_info["available_markets"]
            del target_track_info["disc_number"]
            del target_track_info["is_local"]
            del target_track_info["explicit"]
            del target_track_info["external_ids"]
            del target_track_info["external_urls"]
            del target_track_info["preview_url"]
            del target_track_info["type"]
            print(f"\nTrack found", target_track_info["name"])
            track["spotify"] = target_track_info
        else:
            print(
                f"\nError: target_track_info is not a dictionary: {target_track_info}")
            track["spotify"] = {}

    return track["spotify"]


def process_albums_for_table_processor(table_name, admin_id, admin):
    print(f"Getting {table_name}...")
    unprocessed_albums = fetch_unprocessed_albums.fetch_unprocessed_albums(
        table_name)
    if not unprocessed_albums:
        return
    admin_id = os.getenv('ADMIN_ID')
    admin = get_user_by_id.get_user_by_id(admin_id)
    if not admin:
        print("User not found")
        return

    print('')
    print(f"Found {len(unprocessed_albums)} unprocessed albums.")
    process_unprocessed_albums(admin_id, admin, unprocessed_albums, table_name)


def processor_worker():
    while True:
        try:
            tables = list_tables.list_tables()
            admin_id = os.getenv('ADMIN_ID')
            admin = get_user_by_id.get_user_by_id(admin_id)
            if not admin:
                print("User not found")
                return
            processed = False
            for table_name in tables:
                if process_albums_for_table_processor(table_name, admin_id, admin):
                    processed = True
            if not processed:
                break
        except Exception as error:
            response = {"functionName": "processor_worker",
                        "status": "Error", "message": str(error)}
            raise Exception(response)
        time.sleep(CHECK_INTERVAL)


processor_worker()
