"""
Upload the 4 demo PDFs to the demo@clauseguard.ai account.
Run inside the backend container after generate_demo_contracts.py.
"""
import os
import requests

BASE = "http://localhost:8000"
EMAIL = "demo@clauseguard.ai"
PASSWORD = "demo1234"
SAMPLES = "/samples"

FILES = [
    "master-cloud-services-agreement.pdf",
    "mutual-nda-meridian-acquitech.pdf",
    "executive-employment-agreement-sarah-chen.pdf",
    "vendor-msa-cloudinfra.pdf",
]

def main():
    # Login
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in as {EMAIL}\n")

    for fname in FILES:
        path = os.path.join(SAMPLES, fname)
        if not os.path.exists(path):
            print(f"  SKIP (not found): {path}")
            continue
        with open(path, "rb") as f:
            resp = requests.post(
                f"{BASE}/api/contracts/upload",
                headers=headers,
                files={"file": (fname, f, "application/pdf")},
            )
        d = resp.json()
        contract_id = d.get("id", "???")
        status = d.get("status", d.get("detail", "error"))
        print(f"  {fname[:45]:<45} -> {contract_id}  [{status}]")

    print("\nAll contracts uploaded. Analysis pipeline running in background.")
    print("Check status at: GET /api/contracts/")

if __name__ == "__main__":
    main()
