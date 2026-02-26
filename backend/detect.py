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

def run_detection(image_path, garbage_model_path, pothole_model_path):
    # --- LAYER 1: Garbage Detection ---
    g_model = YOLO(garbage_model_path)
    g_results = g_model(image_path, verbose=False)
    
    best_garbage = None
    for r in g_results:
        if not r.boxes: continue
        for box in r.boxes:
            conf = float(box.conf[0])
            label = g_model.names[int(box.cls[0])]
            if label.lower() == "garbage":
                if not best_garbage or conf > best_garbage["confidence"]:
                    best_garbage = {"type": "garbage", "confidence": float(round(conf, 3))}

    # Logic: If high-confidence garbage found, return immediately
    if best_garbage and best_garbage["confidence"] >= 0.30:
        lat, lng = extract_gps(image_path)
        return {"detections": [best_garbage], "latitude": lat, "longitude": lng}

    # --- LAYER 2: Pothole Detection (Fallback) ---
    p_model = YOLO(pothole_model_path)
    p_results = p_model(image_path, verbose=False)
    
    best_pothole = None
    for r in p_results:
        if not r.boxes: continue
        for box in r.boxes:
            conf = float(box.conf[0])
            label = p_model.names[int(box.cls[0])]
            if label.lower() == "pothole":
                if not best_pothole or conf > best_pothole["confidence"]:
                    best_pothole = {"type": "pothole", "confidence": float(round(conf, 3))}

    # Final decision matrix
    detections = []
    if best_pothole:
        detections.append(best_pothole)
    elif best_garbage:
        detections.append(best_garbage)

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
    base_path = Path(__file__).parent
    
    # Neural Paths
    garbage_path = base_path / "garbage.pt"
    pothole_path = base_path / "pothole.pt"
    
    try:
        result = run_detection(img_path, str(garbage_path), str(pothole_path))
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
