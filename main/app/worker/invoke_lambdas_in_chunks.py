import json
import invoke_lambda


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
