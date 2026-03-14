/**
 * IMER 94.9 - Sistema Digital de Radio
 * Lógica del Cliente (Frontend) - Versión PRO Final Unificada
 */

let listaArchivos = []; 
let colaReproduccion = []; // Array global para la fila del locutor
const audio = document.getElementById('mainAudio');
const API_URL = "http://localhost:3000";
let generoSeleccionado = ''; 

// --- 1. NAVEGACIÓN SPA (MODULAR) ---
async function loadView(file, btn) {
    const main = document.getElementById('mainContent');
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error('Error al cargar vista');
        main.innerHTML = await response.text();

        document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        if (file === 'reproductor.html') {
            actualizarInfoReproductor();
            // Carga las sugerencias reales desde la base de datos al entrar
            cargarSugerenciasReproductor(); 
        }
        if (file === 'buscador.html') {
            generoSeleccionado = '';
            // Forzamos la carga de todas las canciones apenas se abre la vista
            setTimeout(() => filterSongs(), 50); 
        }
        if (file === 'gestion.html') {
            setupDragAndDrop();
            actualizarInterfazCola(); // Asegura que la cola se vea al entrar a gestión
        }
        
    } catch (e) { console.error("Fallo de navegación:", e); }
}

// --- 2. GESTIÓN Y SUBIDA MASIVA ---
function setGeneroRegistro(gen) {
    document.getElementById('addGenre').value = gen;
    const btns = event.target.parentElement.querySelectorAll('.genre-tag');
    btns.forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function setupDragAndDrop() {
    const dz = document.getElementById('dropZone');
    const btnGuardar = document.getElementById('saveBtn');
    if (!dz) return;

    dz.ondragover = (e) => { e.preventDefault(); dz.style.borderColor = "var(--primary)"; };
    dz.ondragleave = () => { dz.style.borderColor = "#334155"; };
    dz.ondrop = (e) => {
        e.preventDefault();
        listaArchivos = Array.from(e.dataTransfer.files).filter(f => f.type.includes('audio'));
        document.getElementById('dropZoneText').innerText = `✅ ${listaArchivos.length} archivos detectados`;
        if (listaArchivos.length === 1) document.getElementById('addTitle').value = listaArchivos[0].name.replace('.mp3', '');
    };
if (btnGuardar) {
        btnGuardar.onclick = (e) => { 
            e.preventDefault(); // <--- ESTO BLOQUEA EL REFRESCO DEFINITIVAMENTE
            subirTodo();
        };
    }
}

async function subirTodo() {
    if (listaArchivos.length === 0) return alert("Arrastra archivos MP3.");
    const genero = document.getElementById('addGenre').value || 'Varios';
    const artista = document.getElementById('addArtist').value || 'Desconocido';
    const btnGuardar = document.getElementById('saveBtn');

    // Feedback visual y bloqueo para evitar cortes
    btnGuardar.disabled = true;
    btnGuardar.innerText = "GUARDANDO...";

    for (let file of listaArchivos) {
        const fd = new FormData();
        fd.append('audioFile', file);
        const tFinal = listaArchivos.length > 1 ? file.name.replace('.mp3','') : document.getElementById('addTitle').value;
        fd.append('titulo', tFinal);
        fd.append('artista', artista);
        fd.append('album', 'Carga Masiva');
        fd.append('genero', genero);
        
        try {
            await fetch(`${API_URL}/agregar`, { method: 'POST', body: fd });
        } catch (error) {
            console.error("Error al subir archivo:", error);
        }
    }

    alert("¡Biblioteca IMER Actualizada!");

    // LIMPIEZA ASÍNCRONA: No usamos loadView para no recargar el DOM del reproductor
    listaArchivos = [];
    document.getElementById('dropZoneText').innerText = "Arrastra tus MP3s aquí";
    if (document.getElementById('addTitle')) document.getElementById('addTitle').value = "";
    if (document.getElementById('addArtist')) document.getElementById('addArtist').value = "";
    
    // Actualizamos la lista de eliminación si estamos en la vista de gestión
    if (document.getElementById('deleteSearch')) buscarParaEliminar();
    
    btnGuardar.disabled = false;
    btnGuardar.innerText = "GUARDAR EN IMER";
}

// --- 3. LÓGICA DE LA COLA Y AL AIRE ---

function añadirALaCola(id, titulo, artista, archivo) {
    colaReproduccion.push({ id, titulo, artista, archivo });
    actualizarInterfazCola();
    // Si no hay nada sonando, empezar automáticamente
    if (audio.paused && !audio.src) reproducirSiguiente();
}

function reproducirSiguiente() {
    if (colaReproduccion.length > 0) {
        const siguiente = colaReproduccion.shift();
        reproducir(siguiente.id, siguiente.titulo, siguiente.artista, siguiente.archivo);
        actualizarInterfazCola();
    } else {
        // Si no hay más en cola, actualizamos icono de play
        document.getElementById('playPauseBtn').innerText = "▶";
    }
}

function actualizarInterfazCola() {
    const list = document.getElementById('queueList');
    const count = document.getElementById('queueCount');
    if (!list) return;
    if (count) count.innerText = colaReproduccion.length;
    
    if (colaReproduccion.length === 0) {
        list.innerHTML = '<div class="empty-queue-msg">Cola vacía</div>';
        return;
    }

    list.innerHTML = colaReproduccion.map((s, index) => `
        <div class="queue-item">
            <div class="song-info"><strong>${s.titulo}</strong><small>${s.artista}</small></div>
            <div style="display:flex; gap:5px; align-items: center;">
                <button onclick="moverEnCola(${index}, -1)" class="nav-link-icon">▲</button>
                <button onclick="moverEnCola(${index}, 1)" class="nav-link-icon">▼</button>
                <button onclick="eliminarDeCola(${index})" class="nav-link-icon">✕</button>
            </div>
        </div>`).join('');
}

function moverEnCola(index, direccion) {
    const nuevaPos = index + direccion;
    // Verificamos que la nueva posición sea válida dentro del array
    if (nuevaPos >= 0 && nuevaPos < colaReproduccion.length) {
        // Intercambio de posiciones (Destructuring assignment)
        [colaReproduccion[index], colaReproduccion[nuevaPos]] = [colaReproduccion[nuevaPos], colaReproduccion[index]];
        actualizarInterfazCola();
    }
}

function eliminarDeCola(index) {
    colaReproduccion.splice(index, 1);
    actualizarInterfazCola();
}

// --- 4. REPRODUCCIÓN ---
async function reproducir(id, titulo, artista, archivo) {
    audio.src = `${API_URL}/music/${archivo}`;
    audio.play();
    
    // El endpoint /reproducir/id es opcional según tu server.js, pero mantenemos la llamada
    fetch(`${API_URL}/reproducir/${id}`, { method: 'POST' }).catch(() => {}); 

    localStorage.setItem('playing_title', titulo);
    localStorage.setItem('playing_artist', artista);
    
    document.getElementById('miniTitle').innerText = titulo;
    document.getElementById('miniArtist').innerText = artista;
    document.getElementById('playPauseBtn').innerText = "⏸";
    
    actualizarInfoReproductor();
    animarVisualizador();
}

// REPRODUCCIÓN CONTINUA (CONEXIÓN CRÍTICA)
audio.onended = () => {
    console.log("Canción finalizada, pasando a la siguiente...");
    reproducirSiguiente();
};

function animarVisualizador() {
    const bars = document.querySelectorAll('.bar');
    if (bars.length === 0 || audio.paused) return;
    bars.forEach(b => b.style.height = `${Math.random() * 30 + 5}px`);
    requestAnimationFrame(animarVisualizador);
}

function actualizarInfoReproductor() {
    const t = localStorage.getItem('playing_title');
    const a = localStorage.getItem('playing_artist');
    if (t && document.getElementById('viewTitle')) {
        document.getElementById('viewTitle').innerText = t;
        document.getElementById('viewArtist').innerText = a;
    }
}

// --- 5. BUSCADOR Y ELIMINACIÓN ---
function setGenero(genero, boton) {
    generoSeleccionado = (generoSeleccionado === genero) ? '' : genero;
    document.querySelectorAll('.genre-tag').forEach(b => b.classList.remove('active'));
    if (generoSeleccionado) boton.classList.add('active');
    filterSongs();
}

async function filterSongs() {
    const q = document.getElementById('searchInput')?.value || '';
    // Corregido: se envían parámetros correctamente para el filtro de géneros
    const res = await fetch(`${API_URL}/buscar?q=${encodeURIComponent(q)}&g=${encodeURIComponent(generoSeleccionado)}`);
    const canciones = await res.json();
    const cont = document.getElementById('results');
    if (!cont) return;

    if (canciones.length === 0) {
        cont.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">Biblioteca vacía</p>';
        return;
    }

    cont.innerHTML = canciones.map(s => `
        <div class="song-item">
            <div class="song-info" onclick="reproducir(${s.id_cancion},'${s.titulo.replace(/'/g, "\\'")}','${s.artista.replace(/'/g, "\\'")}','${s.ruta_archivo}')">
                <strong>${s.titulo}</strong><small>${s.artista}</small>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="reproducir(${s.id_cancion},'${s.titulo.replace(/'/g, "\\'")}','${s.artista.replace(/'/g, "\\'")}','${s.ruta_archivo}')" style="background:var(--primary); color:black; border:none; padding:5px 10px; border-radius:10px; font-weight:800; font-size:10px; cursor:pointer;">AIR</button>
                <button onclick="añadirALaCola(${s.id_cancion},'${s.titulo.replace(/'/g, "\\'")}','${s.artista.replace(/'/g, "\\'")}','${s.ruta_archivo}')" style="background:white; color:black; border:none; padding:5px 10px; border-radius:10px; font-weight:800; font-size:10px; cursor:pointer;">+</button>
            </div>
        </div>`).join('');
}

async function buscarParaEliminar() {
    const q = document.getElementById('deleteSearch').value;
    const res = await fetch(`${API_URL}/buscar?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const cont = document.getElementById('deleteResults');
    if(cont) cont.innerHTML = data.map(s => `
        <div class="song-item" style="padding:10px; margin-bottom:5px; background:rgba(0,0,0,0.3); justify-content: space-between;">
            <div style="font-size:11px; text-align:left;"><strong>${s.titulo}</strong><br><small>${s.artista}</small></div>
            <button class="btn-delete-mini" onclick="eliminarCancion(${s.id_cancion})">ELIMINAR</button>
        </div>`).join('');
}

async function eliminarCancion(id) {
    if (!confirm("¿Borrar permanentemente?")) return;
    await fetch(`${API_URL}/eliminar/${id}`, { method: 'DELETE' });
    buscarParaEliminar();
    if (document.getElementById('results')) filterSongs(); // Refrescar buscador si existe
}

// --- 6. CONTROLES ---
function iniciarControles() {
    const btn = document.getElementById('playPauseBtn');
    const fill = document.getElementById('progressFill');
    const vol = document.getElementById('volumeControlMini');
    const seek = document.querySelector('.progress-container');

    btn.onclick = () => {
        if (!audio.src) return;
        audio.paused ? audio.play() : audio.pause();
        btn.innerText = audio.paused ? "▶" : "⏸";
        animarVisualizador();
    };

    audio.ontimeupdate = () => {
        // Corregido: busca todos los fills (el mini y el de la vista disco)
        const progressFills = document.querySelectorAll('#progressFill');
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressFills.forEach(f => f.style.width = progress + "%");
        }
    };

    if (vol) vol.oninput = (e) => audio.volume = e.target.value;

    if (seek) {
        seek.onclick = (e) => {
            if (!audio.duration) return;
            const rect = seek.getBoundingClientRect();
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
        };
    }
}

async function cargarSugerenciasReproductor() {
    const res = await fetch(`${API_URL}/buscar?q=`); // Petición a la DB real
    const data = await res.json();
    const cont = document.getElementById('reproductorSugerencias');
    if (cont) {
        if (data.length === 0) {
            cont.innerHTML = '<p style="font-size:10px; color:gray; padding:10px;">No hay canciones disponibles.</p>';
            return;
        }
        cont.innerHTML = data.slice(0, 15).map(s => `
            <div class="song-item" onclick="reproducir(${s.id_cancion},'${s.titulo.replace(/'/g, "\\'")}','${s.artista.replace(/'/g, "\\'")}','${s.ruta_archivo}')" style="padding: 10px; background: #000; margin-bottom:5px; cursor:pointer;">
                <div style="font-size:11px; flex:1; text-align:left;"><strong>${s.titulo}</strong><br><small>${s.artista}</small></div>
            </div>`).join('');
    }
}

window.onload = () => {
    loadView('inicio.html', document.querySelector('.nav-link'));
    iniciarControles();
};