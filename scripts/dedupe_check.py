"""
Dedupe query runner for Loopd In database.
Checks for duplicate rows in tables that lack unique constraints (H3, M3).
"""
import os
import mysql.connector
from urllib.parse import urlparse, parse_qs

raw_url = os.environ["DATABASE_URL"]
# Parse mysql://user:pass@host:port/dbname?ssl=...
parsed = urlparse(raw_url)
user = parsed.username
password = parsed.password
host = parsed.hostname
port = parsed.port or 4000
database = parsed.path.lstrip("/").split("?")[0]

conn = mysql.connector.connect(
    host=host,
    port=port,
    user=user,
    password=password,
    database=database,
    ssl_disabled=False,
)
cur = conn.cursor()

queries = {
    "Duplicate friendships (same userId+friendId pair)": """
        SELECT userId, friendId, COUNT(*) AS cnt
        FROM friendships
        GROUP BY userId, friendId
        HAVING cnt > 1
        ORDER BY cnt DESC
        LIMIT 20
    """,
    "Duplicate friendship rows (both directions A→B and B→A pending)": """
        SELECT f1.userId AS user_a, f1.friendId AS user_b,
               f1.status AS a_to_b, f2.status AS b_to_a
        FROM friendships f1
        JOIN friendships f2 ON f1.userId = f2.friendId AND f1.friendId = f2.userId
        WHERE f1.userId < f1.friendId
        LIMIT 20
    """,
    "Duplicate challenge participants (same challengeId+userId)": """
        SELECT challengeId, userId, COUNT(*) AS cnt
        FROM challenge_participants
        GROUP BY challengeId, userId
        HAVING cnt > 1
        ORDER BY cnt DESC
        LIMIT 20
    """,
    "Self-friendships (userId == friendId)": """
        SELECT userId, friendId, status
        FROM friendships
        WHERE userId = friendId
        LIMIT 20
    """,
    "Habit logs per user per habit today (should be ≤ subGoalSteps)": """
        SELECT hl.userId, hl.habitId, h.subGoalSteps, COUNT(*) AS log_count
        FROM habit_logs hl
        JOIN habits h ON h.id = hl.habitId
        WHERE DATE(hl.completedAt) = CURDATE()
        GROUP BY hl.userId, hl.habitId, h.subGoalSteps
        HAVING log_count > COALESCE(h.subGoalSteps, 1)
        ORDER BY log_count DESC
        LIMIT 20
    """,
}

print("=" * 70)
print("LOOPD IN — DEDUPE QUERY RESULTS")
print("=" * 70)

for label, sql in queries.items():
    print(f"\n--- {label} ---")
    try:
        cur.execute(sql)
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]
        if not rows:
            print("  ✓ No duplicates found")
        else:
            print(f"  ⚠  {len(rows)} row(s) returned:")
            print("  " + " | ".join(cols))
            print("  " + "-" * 50)
            for row in rows:
                print("  " + " | ".join(str(v) for v in row))
    except Exception as e:
        print(f"  ERROR: {e}")

cur.close()
conn.close()
print("\n" + "=" * 70)
print("Done.")
