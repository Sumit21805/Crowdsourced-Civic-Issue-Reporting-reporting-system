# CivicGuard: AI-Powered City Intelligence Network

CivicGuard is a premium, full-stack application designed to revolutionize civic reporting using **YOLOv8 AI**, **Real-time Map Intelligence**, and **Neural Aesthetics**. It empowers regular citizens ("Agents") to report city hazards like potholes and garbage, which are then processed by a central "Neural Brain" for department assignment and safe route planning.

---

## 🧠 Core Architecture overview

The project is split into three primary layers:
1.  **Neural Brain (Backend)**: Node.js/Express server managing the SQLite database, AI execution, and email alerts.
2.  **Neural Interface (Frontend)**: A React-Vite application built with a high-end "Cyber-Neural" aesthetic, featuring glassmorphism and dynamic animations.
3.  **Vision Engine (AI)**: A Python-based computer vision script using the YOLO (You Only Look Once) framework to detect hazards in uploaded imagery.

---

## 🛠️ Technology Stack

### Frontend (User & Mobile Interface)
-   **Framework**: React 19 (Vite)
-   **Styling**: Tailwind CSS 4.0 (Utilizing a strict dark-mode neural theme)
-   **Mapping**: Leaflet & React-Leaflet
-   **Icons**: Lucide React
-   **State Management**: React Hooks (useState, useEffect, useRef) with `localStorage` persistence for mobile.
-   **Routing Utilities**: Polyline (Mapbox) for decoding OSRM geometries.

### Backend (Central Processing)
-   **Runtime**: Node.js
-   **API**: Express.js
-   **Database**: SQLite3 (Local file-based SQL for high speed and portability)
-   **File Handling**: Multer (Managing evidence JPG uploads)
-   **Email Alerts**: Nodemailer (Immediate SMTP transmission of AI detection logs)
-   **Security**: Cross-Origin Resource Sharing (CORS) & Dotenv configuration.

### Vision & Logic (AI & Intelligence)
-   **Model**: YOLOv11 (Pre-trained `best.pt` weights for pothole/garbage detection)
-   **Scripting**: Python 3.10+
-   **Libraries**: Torch, Ultralytics, Pillow (for EXIF GPS extraction)
-   **Routing Logic**: Open Source Routing Machine (OSRM) API integrated with custom safety algorithms.

---

## 🛡️ Key Features & Technical logic

### 1. Neural Routing (Safest vs. Fastest)
The application implements two distinct routing philosophies:
-   **Fastest Route**: Uses standard OSRM shortest-path logic, ignoring all map hazards.
-   **Safest Route**: A custom multi-pass algorithm that:
    -   Treats every reported hazard as a **500m Danger Zone**.
    -   Applies a **100,000,000-point penalty** to paths entering these zones.
    -   Uses **Interpolation** (checking coordinates every 50 meters) to ensure no hazard is "jumped over."
    -   **Start-Point Escape**: Generates invisible waypoints to immediately steer users AWAY from nearby hazards before continuing the journey.
    -   **Arterial Discovery**: Proactively searches for major parallel roads up to 2.5km away to find clean detours.

### 2. AI Incident Lifecycle
1.  **Submission**: Agent uploads a photo.
2.  **Processing**: The Node.js server triggers `detect.py`.
3.  **Analysis**: YOLO identifies the hazard. The script also extracts **EXIF GPS Metadata** from the image to verify authentic, unlocated reports.
4.  **Audit Mode**: If AI confidence is low or GPS data is missing, the report enters "Audit Mode" for manual human verification via the **Admin Portal**.
5.  **Assignment**: Authenticated hazards are auto-assigned to the **Road Infrastructure** or **Sanitation** departments.

### 3. Agent Gamification & Leaderboard
-   **Points System**: Agents earn +10 points for a verified auto-report and +5 points when a department resolves their hazard.
-   **Identity Normalization**: All user names are normalized to **Uppercase** at the database level to prevent duplicate entries and ensure Case-Insensitive ranking accuracy.
-   **Dynamic Ranks**: Responsive leaderboard showing the top 10 Agents with unique Rank Icons (Crown for #1, Medals for top 3).

### 4. Portals & Administration
-   **Admin Portal (`admin.html`)**: A command center for approving Audit reports, monitoring global stats, and managing the city infrastructure status.
-   **Department Portal (`dept.html`)**: Mobile-optimized interface for field workers to view assigned hazards and submit "Resolution Notes" with one tap.

---

## 🚀 Execution Guide

### Prerequisites
- Node.js v18+
- Python 3.10+ (with `torch` and `ultralytics` installed)
- Gmail App Password (for Alert Email system)

### Backend Setup
1. `cd backend`
2. `npm install`
3. Configure `.env`:
   ```env
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_RECEIVER=admin_alert_destination@gmail.com
   API_URL=http://localhost:5000
   ```
4. `node server.js`

### Frontend Setup
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5176`

---

## 🔒 Security & Verification
CivicGuard follows strict data integrity rules. Any report submitted without verifiable GPS data is automatically flagged for **Neural Audit**, preventing trolls or fake reports from entering the live city-brain until they are manually cleared by an Admin.

---
*Developed with Advanced Neural Intelligence for Urban Resilience.*
