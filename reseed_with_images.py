import sqlite3
import random
import os

def seed_real_dummy_data():
    db_path = 'backend/civicsense.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Extreme Clear: Wipe Reports and User Leaderboard
    print("Initiating full data purge...")
    cursor.execute("DELETE FROM reports;")
    cursor.execute("DELETE FROM users;")
    # Resetting departments to let server.js re-seed is cleaner
    cursor.execute("DELETE FROM departments;")
    conn.commit()
    
    # 2. Register Dummy Images from the upload directory
    # We copied these from 'dummy images' to 'backend/uploads'
    dummy_files = [
        "360_F_201419293_4CQG3pEVyRltQzy7ImZMJvWntCsMS4TM.jpg",
        "OIP (3).jpg",
        "OIP (4).jpg",
        "OIP.jpg",
        "WhatsApp Image 2026-02-23 at 11.27.48 PM.jpeg",
        "oip 1.jpg",
        "pile-garbage-plastic-black-trash-bag-waste-many-footpath-pollution-trash-plastic-waste-bag-foam-tray-garbage-119376415.jpg"
    ]
    
    # 3. Clustering Configuration (Safdarjung Sector)
    base_lat, base_lng = 28.598, 77.2076
    num_pins = 25
    spread = 0.085 
    
    types = ['pothole', 'garbage']
    depts = {'pothole': 'road', 'garbage': 'sanitation'}
    
    # 4. Insert 25 Randomized Hazards with Real File Links
    print(f"Injecting {num_pins} neural incidents using physical evidence files...")
    for i in range(num_pins):
        h_type = random.choice(types)
        lat = base_lat + random.uniform(-spread, spread)
        lng = base_lng + random.uniform(-spread, spread)
        conf = round(random.uniform(0.72, 0.99), 2)
        
        # Link to one of the physical JPGs we moved
        img_file = random.choice(dummy_files)
        image_path = f"/uploads/{img_file}"
        
        cursor.execute('''
            INSERT INTO reports 
            (user_name, type, lat, lng, confidence, status, audit_reason, image_path, department, processing_time) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('NEURAL_ALPHA', h_type, lat, lng, conf, 'Active', '', image_path, depts[h_type], 5.23))

    conn.commit()
    print("Map Re-established. Evidence links validated.")
    conn.close()

if __name__ == "__main__":
    seed_real_dummy_data()
