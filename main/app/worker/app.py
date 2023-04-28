import os
import json
import time
import boto3
from dotenv import load_dotenv
from datetime import datetime

import list_tables
import fetch_unsaved_albums
import fetch_unprocessed_albums
import invoke_lambda
import get_user_by_id
import invoke_lambdas_in_chunks
import update_user_tokens
import update_album_in_dynamodb

load_dotenv()
s3 = boto3.client('s3', region_name='us-east-1')

tableToProcess = 'r-b'


def app():
    try:
        tables = list_tables.list_tables()
        for table_name in tables:
            if tableToProcess in table_name:
                process_albums_for_table(table_name)

    except Exception as error:
        response = {"functionName": "app",
                    "status": "Error", "message": str(error)}
        raise Exception(f"Failed to process albums: {response}")


def get_token(admin_id, admin):
    token = admin.get('access_token_spotify') or None
    remaining_time_in_minutes = (
        float(admin['expiration_timestamp_spotify'] / 1000) - datetime.now().timestamp()) / 60 if 'expiration_timestamp_spotify' in admin else -1
    minutes = int(remaining_time_in_minutes)
    if minutes <= 15:
        print("getting token...")
        raw_tokens = invoke_lambda.invoke_lambda({
            "FunctionName": f"spotify-token-{os.getenv('STAGE')}",
            "Payload": json.dumps({"user_id": admin_id}),
        })
        tokens = json.loads(raw_tokens)
        update_user_tokens.update_user_tokens(admin, tokens)
        token = tokens['access_token']

    return token


def process_unprocessed_albums(admin_id, admin, unprocessed_albums, table_name):
    for i, album in enumerate(unprocessed_albums):
        token = get_token(admin_id, admin)
        print(f"Searching {i + 1} of {len(unprocessed_albums)}")
        for track in album['tracks']:
            track = process_track(token, track, album)

        # create the update_album_in_dynamodb function
        update_album_in_dynamodb.update_album_in_dynamodb(
            table_name, album)


def process_track(token, track, album):
    track["release_year"] = album["release_date"].split(
        " ")[2] if album.get("release_date") else None
    time.sleep(3)
    target_track = invoke_lambda.invoke_lambda(
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
    track["spotify"] = handle_track_search_response(
        parsed_target_track, token, track)

    return track


def handle_track_search_response(parsed_target_track, token, track):
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
                    }
                ),
            }
        )
        parsed_recognizer_response = json.loads(recognizer_response)
        recognizer_response_info = parsed_recognizer_response["body"]

        if "id" in recognizer_response_info is not None:
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

    else:
        target_track_info = parsed_target_track["body"]
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

    return track["spotify"]


def process_albums_for_table(table_name):
    print(f"Getting {table_name}...")
    print(f"Retrieving unsaved albums from {table_name}")
    unsaved_albums = fetch_unsaved_albums.fetch_unsaved_albums(table_name)
    if not unsaved_albums:
        print({"message": "No unsaved albums found."})
    else:
        print('')
        print(f"Found {len(unsaved_albums)} unsaved albums.")
        invoke_lambdas_in_chunks.invoke_lambdas_in_chunks(
            f"regroovio-downloader-{os.getenv('STAGE')}", unsaved_albums, table_name
        )
    print(f"Retrieving unprocessed albums from {table_name}")
    unprocessed_albums = fetch_unprocessed_albums.fetch_unprocessed_albums(
        table_name)
    if not unprocessed_albums:
        print({"message": "No unprocessed albums found."})
        return
    admin_id = os.getenv('ADMIN_ID')
    print(f'admin_id: {admin_id}')
    admin = get_user_by_id.get_user_by_id(admin_id)
    if not admin:
        print("User not found")
        return

    print('')
    print(f"Found {len(unprocessed_albums)} unprocessed albums.")
    process_unprocessed_albums(admin_id, admin, unprocessed_albums, table_name)


app()
