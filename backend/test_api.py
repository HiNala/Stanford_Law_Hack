"""Quick API verification script — run inside backend container."""
import httpx
import json

c = httpx.Client(base_url="http://localhost:8000", timeout=10, follow_redirects=True)

# Login
r = c.post("/api/v1/auth/login", json={"email": "demo@clauseguard.ai", "password": "demo1234"})
print(f"LOGIN: {r.status_code}")
t = r.json().get("access_token", "")
h = {"Authorization": f"Bearer {t}"}

# Stats
r = c.get("/api/v1/stats/", headers=h)
stats = r.json()
print(f"STATS: {r.status_code} — {stats['total_contracts']} contracts, avg risk {stats['average_risk_score']}")
print(f"  Risk dist: {stats['risk_distribution']}")

# Contracts list
r = c.get("/api/v1/contracts/", headers=h)
items = r.json().get("items", [])
print(f"CONTRACTS: {r.status_code} — {len(items)} items")
for item in items:
    print(f"  [{item['risk_level']}] {item['title'][:55]} (score={item['overall_risk_score']})")

# Clauses for each contract
for item in items:
    cid = item["id"]
    r = c.get(f"/api/v1/clauses/{cid}", headers=h)
    data = r.json()
    clauses = data.get("clauses", [])
    grounded = sum(1 for cl in clauses if (cl.get("metadata_") or cl.get("metadata") or {}).get("legal_grounding"))
    print(f"  CLAUSES {item['title'][:30]}: {r.status_code}, {len(clauses)} clauses, {grounded} grounded")

# Contract detail + risk_distribution
first_id = items[0]["id"]
r = c.get(f"/api/v1/contracts/{first_id}", headers=h)
detail = r.json()
print(f"DETAIL: {r.status_code} — {detail.get('title','?')[:50]}")
print(f"  risk_distribution: {detail.get('risk_distribution', 'MISSING')}")

# Summary endpoint
r = c.get(f"/api/v1/clauses/{first_id}/summary", headers=h)
print(f"CLAUSE SUMMARY: {r.status_code}")

# Chat history
r = c.get(f"/api/v1/chat/{first_id}/history", headers=h)
print(f"CHAT HISTORY: {r.status_code}")

print("\n✓ All endpoints checked.")
