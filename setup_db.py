import sqlite3

def inicializar_db():
    conn = sqlite3.connect('imer_music.db')
    cursor = conn.cursor()
    
    # Eliminamos la tabla vieja para crearla limpia y correcta
    cursor.execute('DROP TABLE IF EXISTS canciones')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS canciones (
            id_cancion INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            artista TEXT NOT NULL,
            genero TEXT NOT NULL,
            ruta_archivo TEXT NOT NULL,
            es_favorito INTEGER DEFAULT 0,
            fecha_agregada DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Base de datos IMER Music RECONSTRUIDA correctamente.")

inicializar_db()