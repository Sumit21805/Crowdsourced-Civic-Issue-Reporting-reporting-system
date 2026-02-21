import time
import sqlite3
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from ultralytics import YOLO
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

# ==============================
# CONFIG
# ==============================

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "upload"
MODEL_PATH = BASE_DIR / "best.pt"
DB_PATH = BASE_DIR / "civicsense.db"

model = YOLO(MODEL_PATH)

# ==============================
# DATABASE
# ==============================

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_name TEXT,
        latitude REAL,
        longitude REAL,
        detected_object TEXT,
        confidence REAL,
        authenticity TEXT,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()

def insert_report(image_name, lat, lon, obj, conf, authenticity):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO reports 
    (image_name, latitude, longitude, detected_object, confidence, authenticity, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (image_name, lat, lon, obj, conf, authenticity, "NOT_DONE"))

    conn.commit()
    conn.close()

# ==============================
# GPS MODULE
# ==============================

def convert_to_degrees(value):
    d = float(value[0])
    m = float(value[1])
    s = float(value[2])
    return d + (m / 60.0) + (s / 3600.0)

def extract_gps(image_path):
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()

        if not exif_data:
            return None, None

        gps_info = {}
        for key, value in exif_data.items():
            tag = TAGS.get(key)
            if tag == "GPSInfo":
                for t in value:
                    sub_tag = GPSTAGS.get(t)
                    gps_info[sub_tag] = value[t]

        lat = convert_to_degrees(gps_info["GPSLatitude"])
        if gps_info["GPSLatitudeRef"] != "N":
            lat = -lat

        lon = convert_to_degrees(gps_info["GPSLongitude"])
        if gps_info["GPSLongitudeRef"] != "E":
            lon = -lon

        return lat, lon

    except Exception:
        return None, None

# ==============================
# DETECTION MODULE
# ==============================

def detect_objects(image_path):
    results = model(image_path)
    detections = []

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = model.names[cls_id]

            if label in ["pothole", "garbage"]:
                detections.append((label, round(conf, 3)))

    return detections

# ==============================
# WATCHER MODULE
# ==============================

class ImageHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return

        if event.src_path.endswith((".jpg", ".jpeg", ".png")):
            print(f"\nNew image detected: {event.src_path}")

            detections = detect_objects(event.src_path)

            if not detections:
                print("No pothole/garbage detected. Skipping.")
                return

            lat, lon = extract_gps(event.src_path)

            if lat is None or lon is None:
                authenticity = "NOT_AUTHENTIC"
            else:
                authenticity = "AUTHENTIC"

            for label, conf in detections:
                insert_report(
                    image_name=Path(event.src_path).name,
                    lat=lat,
                    lon=lon,
                    obj=label,
                    conf=conf,
                    authenticity=authenticity
                )

            print("Stored in database.")

# ==============================
# MAIN
# ============================== )

if __name__ == "__main__":
    init_db()

    event_handler = ImageHandler()
    observer = Observer()
    observer.schedule(event_handler, str(UPLOAD_FOLDER), recursive=False)
    observer.start()

    print("Watching upload folder...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()

