import requests
import json

try:
    response = requests.post(
        "http://localhost:8000/api/auth/forgot-password",
        json={"email": "recovery@test.com"}
    )
    data = response.json()
    print(data.get("debug_reset_link", "Link not found"))
    with open("link.txt", "w") as f:
        f.write(data.get("debug_reset_link", "Link not found"))
except Exception as e:
    print(f"Error: {e}")
