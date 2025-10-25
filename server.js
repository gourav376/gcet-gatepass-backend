const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'gatepasses.json');

if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ requests: [] }, null, 2));
}

function readDatabase() {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
}

function writeDatabase(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

app.get('/api/requests', (req, res) => {
    try {
        const db = readDatabase();
        res.json({ success: true, data: db.requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error reading requests' });
    }
});

app.post('/api/requests', (req, res) => {
    try {
        const { studentName, rollNumber, reason, dateTime } = req.body;
        
        if (!studentName || !rollNumber || !reason || !dateTime) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        const db = readDatabase();
        
        const newRequest = {
            id: Date.now().toString(),
            studentName,
            rollNumber,
            reason,
            dateTime,
            status: 'pending',
            remarks: '',
            createdAt: new Date().toISOString(),
            approvedAt: null,
            scannedAt: null
        };

        db.requests.push(newRequest);
        writeDatabase(db);

        res.json({ 
            success: true, 
            message: 'Gate pass request submitted successfully',
            data: newRequest 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error creating request' 
        });
    }
});

app.put('/api/requests/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Valid status (approved/rejected) is required' 
            });
        }

        const db = readDatabase();
        const requestIndex = db.requests.findIndex(r => r.id === id);

        if (requestIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Request not found' 
            });
        }

        db.requests[requestIndex].status = status;
        db.requests[requestIndex].remarks = remarks || '';
        db.requests[requestIndex].approvedAt = new Date().toISOString();

        writeDatabase(db);

        res.json({ 
            success: true, 
            message: `Request ${status} successfully`,
            data: db.requests[requestIndex]
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error updating request' 
        });
    }
});

app.post('/api/scan/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = readDatabase();
        const request = db.requests.find(r => r.id === id);

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Gate pass not found' 
            });
        }

        if (request.status !== 'approved') {
            return res.status(400).json({ 
                success: false, 
                message: 'Gate pass is not approved' 
            });
        }

        request.scannedAt = new Date().toISOString();
        writeDatabase(db);

        res.json({ 
            success: true, 
            message: 'Gate pass scanned successfully',
            data: request
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error scanning gate pass' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`✅ Database file: ${dbPath}`);
    console.log(`\n📋 Available API Endpoints:`);
    console.log(`   GET    /api/requests          - Get all requests`);
    console.log(`   POST   /api/requests          - Create new request`);
    console.log(`   PUT    /api/requests/:id      - Update request status`);
    console.log(`   POST   /api/scan/:id          - Scan gate pass`);
});
