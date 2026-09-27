from app.services.ai import client, MODEL_NAME


response = client.models.generate_content(
    model=MODEL_NAME,
    contents="Reply with exactly: InsightAI Gemini connection successful."
)

print(response.text)