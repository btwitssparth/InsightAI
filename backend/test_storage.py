from app.services.storage import upload_dataset_file


test_content = b"hello from InsightAI"

response = upload_dataset_file(
    file_bytes=test_content,
    storage_path="test/hello.txt",
    content_type="text/plain",
)

print("Upload successful!")
print(response)