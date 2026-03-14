const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta absoluta al archivo de la base de datos
const dbPath = path.resolve(__dirname, 'imer_music.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Error al abrir la DB:", err.message);
    } else {
        console.log("✅ Conexión exitosa a imer_music.db");
        // Habilitar llaves foráneas para las 6 tablas relacionales
        db.run("PRAGMA foreign_keys = ON");
    }
});

// Exportación correcta para que server.js lo reconozca
module.exports = db;