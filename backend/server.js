const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg') {
            cb(null, true);
        } else {
            cb(new Error('Only .jpg files are allowed!'), false);
        }
    }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('🚀 CivicGuard Brain is Online! Use /api/incidents to see data.');
});

let incidents = [];

app.get('/api/incidents', (req, res) => {
    res.json(incidents);
});

app.post('/api/report', upload.single('image'), (req, res) => {
    const { type, lat, lng, severity } = req.body;
    if (!type || !lat || !lng) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const newIncident = {
        id: incidents.length + 1,
        type,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        severity: severity || 'Medium',
        status: 'Active',
        reportedAt: new Date().toISOString(),
        imagePath: req.file ? `/uploads/${req.file.filename}` : null
    };

    incidents.push(newIncident);
    res.status(201).json(newIncident);
});

app.patch('/api/incidents/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const incident = incidents.find(inc => inc.id === id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    if (status) incident.status = status;
    res.json(incident);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 civicGuard Brain running on http://192.168.1.7:${PORT}`);
});
