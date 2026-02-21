import sqlite3

conn = sqlite3.connect("civicsense.db")
cursor = conn.cursor()

cursor.execute("SELECT * FROM reports ORDER BY id DESC LIMIT 1  ")

rows = cursor.fetchall()

print("\n--- STORED REPORTS ---\n")

for row in rows:
    print("ID:", row[0])
    print("Image:", row[1])
    print("Latitude:", row[2])
    print("Longitude:", row[3])
    print("Object:", row[4])
    print("Confidence:", row[5])
    print("Authenticity:", row[6])
    print("Status:", row[7])
    print("Timestamp:", row[8])
    print("-" * 40)

conn.close()

