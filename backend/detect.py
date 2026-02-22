import sys
import json
import torch
from ultralytics import YOLO
from pathlib import Path
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

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

        if not gps_info:
            return None, None

        lat = convert_to_degrees(gps_info["GPSLatitude"])
        if gps_info.get("GPSLatitudeRef") != "N":
            lat = -lat

        lon = convert_to_degrees(gps_info["GPSLongitude"])
        if gps_info.get("GPSLongitudeRef") != "E":
            lon = -lon

        return lat, lon
    except Exception:
        return None, None

def run_detection(image_path, model_path):
    model = YOLO(model_path)
    results = model(image_path, verbose=False)
    
    detections = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = model.names[cls_id]
            if label in ["pothole", "garbage"]:
                detections.append({
                    "type": label,
                    "confidence": round(conf, 3)
                })
    
    lat, lng = extract_gps(image_path)
    
    return {
        "detections": detections,
        "latitude": lat,
        "longitude": lng
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    img_path = sys.argv[1]
    model_path = Path(__file__).parent / "best.pt"
    
    try:
        result = run_detection(img_path, str(model_path))
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
