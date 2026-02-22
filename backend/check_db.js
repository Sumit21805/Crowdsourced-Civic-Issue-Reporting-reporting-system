const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./civicsense.db');
db.all('SELECT * FROM reports', [], (err, rows) => {
    if (err) { console.error(err); }
    else { console.log(JSON.stringify(rows, null, 2)); }
    db.close();
});
