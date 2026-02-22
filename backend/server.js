const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');

const app = express();
const PORT = 5000;

// Database Setup
const db = new sqlite3.Database(path.join(__dirname, 'civicsense.db'));

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
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ai-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

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

        // Random Delhi Coords
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
