import list_tables
import fetch_unsaved_albums
import fetch_unprocessed_albums
import invoke_lambda
import compare_audio_files
import get_user_by_id
import invoke_lambdas_in_chunks
import update_user_tokens


import os
import json
import boto3
import requests
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()


s3 = boto3.client('s3', region_name='us-east-1')


def app(table):
    try:
        print(f"Getting {table}...")
        tables = list_tables.list_tables(table)
        for table_name in tables:
            print(f"Retrieving unsaved albums from {table_name}")
            unsaved_albums = fetch_unsaved_albums.fetch_unsaved_albums(
                table_name)
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
            admin = get_user_by_id.get_user_by_id(admin_id)
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
                raw_tokens = invoke_lambda.invoke_lambda({
                    "FunctionName": f"spotify-token-{os.getenv('STAGE')}",
                    "Payload": json.dumps({"user_id": admin_id}),
                })
                tokens = json.loads(raw_tokens)
                update_user_tokens.update_user_tokens(admin, tokens)
                token = tokens['access_token']
            print('')
            print(f"Found {len(unprocessed_albums)} unprocessed albums.")
            recognize_tracks = []
            found_tracks = []
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
                    if parsed_target_track.get("statusCode") == 404:
                        print('')
                        print(f"Track not found: {track['name']}")
                        print({"track": track})
                        recognize_tracks.append(track)
                    else:
                        target_track_info = parsed_target_track["body"]
                        # similarity_percentage = compare_audio_files.compare_audio_files(
                        #     track["sourceTrackUrl"], target_track_info["preview_url"])

                        print(track["sourceTrackUrl"])
                        print(target_track_info["preview_url"])

                        response1 = requests.get(track["sourceTrackUrl"])
                        with open(f"data/{track['name']}.mp3", "wb") as f:
                            f.write(response1.content)

                        response2 = requests.get(
                            target_track_info["preview_url"])
                        with open(f"data/{track['name']}-preview.mp3", "wb") as f:
                            f.write(response2.content)

                        print('')
                        # if similarity_percentage > 80:
                        #     print(f"Track found")
                        #     found_tracks.append(track)
                        # else:
                        #     print(f"Track not found")
                        #     recognize_tracks.append(track)
                        # print(track["name"])
                        # print(f"Score: {similarity_percentage}")

                print(f"Found {len(found_tracks)} tracks")
                print(album['tracks'])
                print(found_tracks)
                # if len(recognize_tracks):
                # print(f"Found {len(recognize_tracks)} tracks to recognize")
                # invoke_lambdas_in_chunks.invoke_lambdas_in_chunks(
                #     f"regroovio-recognizer-{os.getenv('STAGE')}", recognize_tracks, table_name
                # )
        i += 1

    except Exception as error:
        response = {"functionName": table,
                    "status": "Error", "message": str(error)}
        raise Exception(f"Failed to process albums: {response}")


app('daily')
