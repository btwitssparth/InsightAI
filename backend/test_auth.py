import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SECRET_KEY"),
)

email = input("Email: ")
password = input("Password: ")

response = supabase.auth.sign_in_with_password({
    "email": email,
    "password": password,
})

print("\nLogin successful.")
print("Access token:")
print(response.session.access_token)