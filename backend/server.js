const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendAlertEmail = (report) => {
    const mailOptions = {
        from: `"CivicGuard AI Alerts" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_RECEIVER,
        subject: `🚨 Hazard Alert: ${report.type.toUpperCase()} Isolated`,
        html: `
            <div style="font-family: Arial, sans-serif; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; color: #1e293b; max-width: 600px;">
                <h1 style="color: #ef4444; font-size: 24px;">Hazard Detection Log</h1>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <div style="margin-bottom: 20px;">
                    <p><strong>Incident ID:</strong> #${report.id}</p>
                    <p><strong>Type:</strong> ${report.type.toUpperCase()}</p>
                    <p><strong>Status:</strong> <span style="color: #3b82f6;">${report.status}</span></p>
                    <p><strong>AI Confidence:</strong> ${(report.confidence * 100).toFixed(1)}%</p>
                    <p><strong>Agent Name:</strong> ${report.userName}</p>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 14px;"><strong>Location Pins:</strong></p>
                    <p style="margin: 5px 0 0 0; color: #64748b;">${report.lat.toFixed(6)}, ${report.lng.toFixed(6)}</p>
                    <a href="https://www.google.com/maps?q=${report.lat},${report.lng}" style="display: inline-block; margin-top: 10px; color: #3b82f6; text-decoration: none; font-size: 12px; font-weight: bold;">View on Satellite Map →</a>
                </div>
                <div style="text-align: center; background: #0f172a; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                    <img src="${process.env.API_URL}${report.imagePath}" style="max-width: 100%; display: block; margin: 0 auto;" alt="Evidence">
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center;">Neural link secure. Auto-transmitted from CivicGuard Node.</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error("Email Error:", error);
        else console.log("Alert Transmitted:", info.response);
    });
};

const app = express();
const PORT = 5000;

// Database Setup
const dbPath = path.join(__dirname, 'civicsense.db');
console.log('Using database at:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Users table for leaderboard
    db.run(`CREATE TABLE IF NOT EXISTS users (
        name TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0
    )`);

    // Reports table
    db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT,
        type TEXT,
        lat REAL,
        lng REAL,
        confidence REAL,
        status TEXT, -- 'Active', 'Assigned', 'Resolved', 'Audit'
        audit_reason TEXT,
        image_path TEXT,
        reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processing_time REAL
    )`);

    // Add department columns if they don't exist (safe migration)
    db.run(`ALTER TABLE reports ADD COLUMN department TEXT DEFAULT NULL`, (err) => {
        // Ignore "duplicate column" error — means it already exists
    });
    db.run(`ALTER TABLE reports ADD COLUMN assigned_at DATETIME DEFAULT NULL`, (err) => { });
    db.run(`ALTER TABLE reports ADD COLUMN resolved_at DATETIME DEFAULT NULL`, (err) => { });
    db.run(`ALTER TABLE reports ADD COLUMN resolution_note TEXT DEFAULT NULL`, (err) => { });

    // Departments table
    db.run(`CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT,
        icon TEXT,
        handles TEXT -- comma-separated types like 'pothole,crack'
    )`);

    // Seed departments (matching AI detection capabilities: pothole + garbage)
    const departments = [
        { id: 'road', name: 'Road & Infrastructure Dept', icon: '🛣️', handles: 'pothole' },
        { id: 'sanitation', name: 'Sanitation & Waste Dept', icon: '♻️', handles: 'garbage' },
    ];

    // Clean up old departments that AI can't detect
    db.run("DELETE FROM departments WHERE id NOT IN ('road', 'sanitation')");

    departments.forEach(dept => {
        db.run(`INSERT OR IGNORE INTO departments (id, name, icon, handles) VALUES (?, ?, ?, ?)`,
            [dept.id, dept.name, dept.icon, dept.handles]);
    });
});

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ai-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const uploadPath = path.join(__dirname, 'uploads');
console.log('Serving uploads from:', uploadPath);
app.use('/uploads', express.static(uploadPath));

// =================== API ROUTES ===================

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
    db.all("SELECT name, points FROM users ORDER BY points DESC LIMIT 10", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// All Incidents
app.get('/api/incidents', (req, res) => {
    db.all("SELECT * FROM reports ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Departments List
app.get('/api/departments', (req, res) => {
    db.all("SELECT * FROM departments", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Department Reports (filter by department)
app.get('/api/departments/:id/reports', (req, res) => {
    db.all("SELECT * FROM reports WHERE department = ? ORDER BY assigned_at DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Department Stats
app.get('/api/departments/:id/stats', (req, res) => {
    const deptId = req.params.id;
    db.get(`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
    FROM reports WHERE department = ?`, [deptId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// Audit API
app.get('/api/audit', (req, res) => {
    db.all("SELECT * FROM reports WHERE status = 'Audit'", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Assign to Department
app.patch('/api/incidents/:id/assign', (req, res) => {
    const { department } = req.body;
    if (!department) return res.status(400).json({ error: "Department required" });

    db.run(`UPDATE reports SET status = 'Assigned', department = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [department, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Send Alert for manual assignment
            db.get("SELECT * FROM reports WHERE id = ?", [req.params.id], (err2, row) => {
                if (!err2 && row) {
                    sendAlertEmail({
                        id: row.id,
                        type: row.type,
                        status: row.status,
                        confidence: row.confidence,
                        userName: row.user_name,
                        lat: row.lat,
                        lng: row.lng,
                        imagePath: row.image_path
                    });
                }
            });

            res.json({ success: true, message: `Assigned to department: ${department}` });
        }
    );
});

// Resolve Report
app.patch('/api/incidents/:id/resolve', (req, res) => {
    const { resolution_note } = req.body;

    db.run(`UPDATE reports SET status = 'Resolved', resolved_at = CURRENT_TIMESTAMP, resolution_note = ? WHERE id = ?`,
        [resolution_note || '', req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Award points to the reporter
            db.get("SELECT user_name FROM reports WHERE id = ?", [req.params.id], (err2, row) => {
                if (!err2 && row) {
                    db.run("UPDATE users SET points = points + 5 WHERE name = ?", [row.user_name]);
                }
            });

            res.json({ success: true, message: 'Report resolved' });
        }
    );
});

// Update Status (generic)
app.patch('/api/incidents/:id', (req, res) => {
    const { status } = req.body;
    db.run("UPDATE reports SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Delete Report
app.delete('/api/incidents/:id', (req, res) => {
    db.run("DELETE FROM reports WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Report Processing
app.post('/api/report', upload.single('image'), (req, res) => {
    const startTime = Date.now();
    const { userName, autoLocation } = req.body;
    const isAutoLoc = autoLocation === 'true' || autoLocation === true;

    if (!userName) return res.status(400).json({ error: "User name required" });
    if (!req.file) return res.status(400).json({ error: "Image required" });

    const imagePath = `/uploads/${req.file.filename}`;
    const fullPath = path.join(__dirname, 'uploads', req.file.filename);

    // Call Python Detection
    exec(`python detect.py "${fullPath}"`, (error, stdout, stderr) => {
        const processingTime = (Date.now() - startTime) / 1000;
        let aiResult = { detections: [], latitude: null, longitude: null };

        try {
            aiResult = JSON.parse(stdout);
        } catch (e) {
            console.error("AI parse error:", stdout);
        }

        let bestDetection = aiResult.detections && aiResult.detections.length > 0
            ? aiResult.detections.reduce((prev, current) => (prev.confidence > current.confidence) ? prev : current)
            : null;

        let finalLat = aiResult.latitude;
        let finalLng = aiResult.longitude;
        let status = 'Active';
        let auditReason = '';

        // ⭐ Priority 1: Live GPS from browser (camera mode) — most accurate
        const clientLat = parseFloat(req.body.lat);
        const clientLng = parseFloat(req.body.lng);
        if (!isNaN(clientLat) && !isNaN(clientLng)) {
            finalLat = clientLat;
            finalLng = clientLng;
            console.log(`📍 Using live browser GPS: ${finalLat}, ${finalLng}`);
        }

        // Priority 2: Random Delhi Coords fallback (only if no GPS at all)
        if (!finalLat && isAutoLoc && bestDetection) {
            finalLat = 28.5 + (Math.random() * 0.1);
            finalLng = 77.1 + (Math.random() * 0.1);
        }

        // Logic check
        if (!bestDetection) {
            status = 'Audit';
            auditReason = 'No pothole/garbage detected by AI';
        } else if (!finalLat || !finalLng) {
            status = 'Audit';
            auditReason = 'No GPS data found and Auto-Location is OFF';
        } else if (bestDetection.confidence < 0.4) {
            status = 'Audit';
            auditReason = `Low confidence (${(bestDetection.confidence * 100).toFixed(1)}%)`;
        }

        // Auto-assign department based on AI detection type
        let department = null;
        if (status === 'Active') {
            const type = bestDetection ? bestDetection.type : 'unknown';
            if (type === 'pothole') {
                department = 'road';
            } else if (type === 'garbage') {
                department = 'sanitation';
            }
            if (department) status = 'Assigned';
        }

        // Insert Report
        const type = bestDetection ? bestDetection.type : 'unknown';
        const confidence = bestDetection ? bestDetection.confidence : 0;

        db.run(`INSERT INTO reports (user_name, type, lat, lng, confidence, status, audit_reason, image_path, processing_time, department, assigned_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${department ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
            [userName, type, finalLat, finalLng, confidence, status, auditReason, imagePath, processingTime, department],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Increment points if authorized
                if (status === 'Assigned') {
                    db.run("INSERT OR IGNORE INTO users (name, points) VALUES (?, 0)", [userName]);
                    db.run("UPDATE users SET points = points + 10 WHERE name = ?", [userName]);

                    // Send AI Alert immediately
                    sendAlertEmail({
                        id: this.lastID,
                        type,
                        status,
                        confidence,
                        userName,
                        lat: finalLat,
                        lng: finalLng,
                        imagePath
                    });
                }

                res.status(201).json({
                    id: this.lastID,
                    status,
                    audit_reason: auditReason,
                    processing_time: processingTime,
                    type,
                    department,
                    lat: finalLat,
                    lng: finalLng
                });
            }
        );
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CivicGuard Brain (AI-SQL) running on port ${PORT}`);
});
