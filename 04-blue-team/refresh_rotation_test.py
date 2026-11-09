import os, requests
from dotenv import load_dotenv # type: ignore

load_dotenv()
DOMAIN, CLIENT_ID, CLIENT_SECRET = os.getenv("AUTH0_DOMAIN"), os.getenv("CLIENT_ID"), os.getenv("CLIENT_SECRET")

def use_refresh_token(token):
    r = requests.post(f"https://{DOMAIN}/oauth/token", json={
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": token,
    })
    return r.status_code, r.json()

first_token = os.getenv("INITIAL_REFRESH_TOKEN")   # get this once by logging in via app.js /login
status, body = use_refresh_token(first_token)
print(f"[1st use] {status} -> {body}")

print(f"\n[Replay old token] ", end="")
status2, body2 = use_refresh_token(first_token)     # same token reused
print(f"{status2} -> {body2}")