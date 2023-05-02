import os
import time
import boto3
import threading
import json
import decimal
import invoke_lambda
from dotenv import load_dotenv

import list_tables
import fetch_unsaved_albums

load_dotenv()
s3 = boto3.client('s3', region_name='us-east-1')

CHECK_INTERVAL = 60 * 60  # Check every 1 hour


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def process_albums_for_table_downloader(table_name):
    print(f"Getting {table_name}...")
    chunk_size = 10
    albums = fetch_unsaved_albums.fetch_unsaved_albums(table_name)
    if not albums:
        print({"message": "No unsaved albums found."})
        return
    if len(albums) < chunk_size:
        chunk_size = len(albums)
    for i in range(0, len(albums), chunk_size):
        chunk = albums[i: i + chunk_size]
        print(
            f"Downloading chunk {i // chunk_size + 1} of {len(albums) // chunk_size +1}")
        for album in chunk:
            invoke_lambda.invoke_lambda(
                {
                    "FunctionName": f"regroovio-downloader-{os.getenv('STAGE')}",
                    "Payload": json.dumps(
                        {
                            "tableName": table_name,
                            "album": album
                        }, cls=DecimalEncoder
                    ),
                }
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
