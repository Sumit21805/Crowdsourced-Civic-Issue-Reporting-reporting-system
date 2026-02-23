import sqlite3
import random

def seed_demo_data():
    conn = sqlite3.connect('backend/civicsense.db')
    cursor = conn.cursor()
    
    # 1. Clear existing map data (keep Audit for safety)
    cursor.execute("DELETE FROM reports WHERE status != 'Audit';")
    
    # 2. Configuration for the cluster
    base_lat, base_lng = 28.520, 77.165 # Centered area
    num_pins = 25
    spread = 0.012 # Roughly 1.2km radius
    
    types = ['pothole', 'garbage']
    depts = {'pothole': 'road', 'garbage': 'sanitation'}
    imgs = {'pothole': '/pothole.jpg', 'garbage': '/garbage.jpg'}
    
    # 3. Generate and Insert
    for i in range(num_pins):
        h_type = random.choice(types)
        # Create a "messy" but localized spread
        lat = base_lat + random.uniform(-spread, spread)
        lng = base_lng + random.uniform(-spread, spread)
        conf = round(random.uniform(0.70, 0.99), 2)
        
        cursor.execute('''
            INSERT INTO reports 
            (user_name, type, lat, lng, confidence, status, audit_reason, image_path, department) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('DEMO_ALPHA', h_type, lat, lng, conf, 'Active', '', imgs[h_type], depts[h_type]))

    conn.commit()
    print(f"Map Cleared. {num_pins} Neural Hazards seeded in demonstration cluster.")
    conn.close()

if __name__ == "__main__":
    seed_demo_data()
