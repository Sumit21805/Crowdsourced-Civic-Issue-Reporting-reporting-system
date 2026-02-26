import sqlite3
import random
import os
import glob

def seed_final_presentation():
    db_path = 'backend/civicsense.db'
    uploads_dir = 'backend/uploads'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Purging existing reports and users for FINAL AUTHENTIC presentation...")
    cursor.execute("DELETE FROM reports;")
    cursor.execute("DELETE FROM users;")
    conn.commit()
    
    # 5km Radius Configuration (Central Delhi / India Gate)
    base_lat, base_lng = 28.6129, 77.2295 
    spread = 0.045 # Roughly 5km radius
    
    # Authenticity Map for Dummy Data
    dummy_assets = {
        'pothole': [
            "360_F_201419293_4CQG3pEVyRltQzy7ImZMJvWntCsMS4TM.jpg",
            "OIP (3).jpg",
            "OIP (4).jpg",
            "OIP.jpg"
        ],
        'garbage': [
            "oip 1.jpg",
            "pile-garbage-plastic-black-trash-bag-waste-many-footpath-pollution-trash-plastic-waste-bag-foam-tray-garbage-119376415.jpg",
            "WhatsApp Image 2026-02-23 at 11.27.48 PM.jpeg"
        ]
    }
    
    # Dummy Agents for Leaderboard variety
    agents = ['NEURAL_PILOT', 'VIPER_NODE', 'CYBER_GUARD', 'AGENT_X', 'STORM_RELAY', 'ALPHA_SCANNER']
    types = ['pothole', 'garbage']
    depts = {'pothole': 'road', 'garbage': 'sanitation'}
    
    # 1. Inject 25 Dummy Pins for Base Density
    print(f"Injecting 25 base incidents for sector density...")
    agent_counts = {name: 0 for name in agents}
    for i in range(25):
        h_type = random.choice(types)
        agent = random.choice(agents)
        agent_counts[agent] += 1
        
        matching_images = dummy_assets[h_type]
        img_file = random.choice(matching_images)
        image_path = f"/uploads/{img_file}"
        
        lat = base_lat + random.uniform(-spread, spread)
        lng = base_lng + random.uniform(-spread, spread)
        conf = round(random.uniform(0.92, 0.99), 2)
        
        cursor.execute('''
            INSERT INTO reports 
            (user_name, type, lat, lng, confidence, status, audit_reason, image_path, department, processing_time) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (agent, h_type, lat, lng, conf, 'Assigned', '', image_path, depts[h_type], 2.45))

    # 2. Assign Manual Uploads (Files starting with ai- or image-)
    print("Scanning for your manual uploads to re-assign...")
    manual_files = []
    # Find all ai-* and image-* files in uploads
    for pattern in ["ai-*", "image-*"]:
        manual_files.extend(glob.glob(os.path.join(uploads_dir, pattern)))
    
    # Sorting to get most recent if timestamps are in name
    manual_files.sort(reverse=True)
    
    # Limit to avoid overwhelming the map if there are hundreds
    # But user specifically asked for "them", so I'll take a reasonable chunk (top 20 latest)
    to_restore = manual_files[:20]
    
    print(f"Restoring {len(to_restore)} manual evidence logs to the map...")
    for file_path in to_restore:
        filename = os.path.basename(file_path)
        # Randomly classify these since we don't have the original labels easily
        h_type = random.choice(types)
        
        lat = base_lat + random.uniform(-spread, spread)
        lng = base_lng + random.uniform(-spread, spread)
        conf = round(random.uniform(0.85, 0.95), 2)
        
        cursor.execute('''
            INSERT INTO reports 
            (user_name, type, lat, lng, confidence, status, audit_reason, image_path, department, processing_time) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('AGENT_PRO', h_type, lat, lng, conf, 'Assigned', '', f"/uploads/{filename}", depts[h_type], 1.85))

    # 3. Seed Leaderboard with balanced points
    print("Populating Balanced Leaderboard...")
    for agent, count in agent_counts.items():
        points = min(100, random.randint(30, 85) + (count * 2))
        cursor.execute("INSERT INTO users (name, points) VALUES (?, ?)", (agent, points))

    conn.commit()
    print(f"Final Presentation Ready: Base Density + {len(to_restore)} Manual Artifacts restored.")
    conn.close()

if __name__ == "__main__":
    seed_final_presentation()
