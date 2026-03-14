const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors'); // Se agrega la librería para permisos de red
const db = require('./database');

const app = express();

app.use(cors()); // Se activa CORS para que el navegador permita ver las canciones
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/music', express.static(path.join(__dirname, 'music')));

// Asegurar que la carpeta music exista
if (!fs.existsSync('./music')) {
    fs.mkdirSync('./music');
}

// Configuración de almacenamiento para MP3
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'music/'),
    filename: (req, file, cb) => {
        // Limpiamos el nombre original de espacios para evitar errores de URL
        const cleanName = file.originalname.replace(/\s+/g, '_');
        cb(null, Date.now() + '-' + cleanName);
    }
});
const upload = multer({ storage });

// 1. AGREGAR CANCIÓN
app.post('/agregar', upload.single('audioFile'), (req, res) => {
    const { titulo, artista, genero } = req.body;
    const archivo = req.file ? req.file.filename : null;

    // LOGS PARA VER QUÉ LLEGA AL SERVIDOR
    console.log("--- Intento de Registro ---");
    console.log("Datos recibidos:", { titulo, artista, genero, archivo });

    if (!archivo) {
        console.error("❌ Error: No se recibió el archivo de audio.");
        return res.status(400).json({ error: "Archivo no recibido" });
    }

    const sql = `INSERT INTO canciones (titulo, artista, genero, ruta_archivo) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [titulo, artista, genero, archivo], function(err) {
        if (err) {
            // ESTO APARECERÁ EN TU TERMINAL SI LA BASE DE DATOS FALLA
            console.error("❌ ERROR DE SQLITE:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("✅ ÉXITO: Guardado en DB con ID:", this.lastID);
        // Respuesta JSON para que el frontend no refresque
        res.json({ success: true, id: this.lastID });
    });
});

// 2. BUSCADOR CON FILTROS FUNCIONALES
app.get('/buscar', (req, res) => {
    const query = `%${req.query.q || ''}%`;
    const genero = req.query.g || ''; 
    
    let sql = `SELECT * FROM canciones WHERE (titulo LIKE ? OR artista LIKE ?)`;
    let params = [query, query];

    if (genero && genero !== '') {
        sql += ` AND genero = ?`;
        params.push(genero);
    }

    sql += ` ORDER BY id_cancion DESC`; 
    
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows || []);
    });
});

// 3. ELIMINAR CANCIÓN Y ARCHIVO FÍSICO
app.delete('/eliminar/:id', (req, res) => {
    db.get("SELECT ruta_archivo FROM canciones WHERE id_cancion = ?", [req.params.id], (err, row) => {
        if (row && row.ruta_archivo) {
            const filePath = path.join(__dirname, 'music', row.ruta_archivo);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
        }
        db.run("DELETE FROM canciones WHERE id_cancion = ?", [req.params.id], () => {
            res.json({ success: true });
        });
    });
});

app.listen(3000, () => console.log("IMER Server activo en http://localhost:3000"));