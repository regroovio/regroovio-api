import os
import time
import boto3
import threading
from dotenv import load_dotenv

import list_tables
import fetch_unsaved_albums
import invoke_lambdas_in_chunks

load_dotenv()
s3 = boto3.client('s3', region_name='us-east-1')

CHECK_INTERVAL = 60 * 60  # Check every 1 hour


def process_albums_for_table_downloader(table_name):
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


def downloader_worker(table_name):
    while True:
        try:
            process_albums_for_table_downloader(table_name)
        except Exception as error:
            response = {"functionName": "downloader_worker",
                        "status": "Error", "message": str(error)}
            raise Exception(f"Failed to process albums: {response}")
        time.sleep(CHECK_INTERVAL)


if __name__ == '__main__':
    tables = list_tables.list_tables()
    threads = []

    for table_name in tables:
        downloader_thread = threading.Thread(
            target=downloader_worker, args=(table_name,))
        downloader_thread.start()
        threads.append(downloader_thread)

    for thread in threads:
        thread.join()
