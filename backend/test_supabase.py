from app.services.supabase import supabase

response = supabase.storage.list_buckets()

print("Supabase connection successful!")
print(response)