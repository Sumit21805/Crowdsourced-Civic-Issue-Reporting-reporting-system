const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./civicsense.db');
db.all('SELECT id, type, status, lat, lng FROM reports', (e, rows) => {
    console.log('Total records:', rows ? rows.length : 0);
    if (rows) rows.forEach(r => console.log(r));
    db.close();
});
