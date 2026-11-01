let appState = {
    movies: [],
    categories: [],
    directors: [],
    actors: [],
    currentUser: null
};

document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
});

async function loadInitialData() {
    try {
        const [moviesRes, catsRes, dirRes, actRes] = await Promise.all([
            apiRequest('/peliculas').catch(() => ({ data: [] })),
            apiRequest('/categorias').catch(() => ({ data: [] })),
            apiRequest('/directores').catch(() => ({ data: [] })),
            apiRequest('/actores').catch(() => ({ data: [] }))
        ]);

        appState.movies = moviesRes.data || moviesRes || [];
        appState.categories = catsRes.data || catsRes || [];
        appState.directors = dirRes.data || dirRes || [];
        appState.actors = actRes.data || actRes || [];

        renderCategoryFilters();
        renderMediaGrid(appState.movies);
        renderCategoriesView();
        renderCastView();
    } catch (e) {
        console.error("Error cargando datos de la API", e);
    }
}

function renderMediaGrid(items) {
    const grid = document.getElementById('media-grid');
    if (!items.length) {
        grid.innerHTML = `<p class="empty-state">No hay elementos disponibles.</p>`;
        return;
    }
    grid.innerHTML = items.map(m => `
        <article class="media-card" onclick="showDetail(${m.idpelicula})" tabindex="0" onkeydown="if(event.key === 'Enter' || event.key === ' ') showDetail(${m.idpelicula})">
            <img ${m.imagen ? `src="${m.imagen}"` : ''} alt="Póster de ${m.titulo}" class="media-poster" loading="lazy">
            <div class="media-copy">
                <span class="media-type">Película / Serie</span>
                <h3>${m.titulo}</h3>
                <p>${m.sinopsis || 'Sinopsis no disponible.'}</p>
            </div>
        </article>
    `).join('');
}

async function showDetail(id) {
    try {
        const res = await apiRequest(`/peliculas/${id}`);
        const movie = res.data || res;

        const detailCard = document.getElementById('detail-card');
        detailCard.innerHTML = `
            <div class="detail-layout">
                <img ${movie.imagen ? `src="${movie.imagen}"` : ''} alt="Póster de ${movie.titulo}" class="detail-poster">
                <div class="detail-copy">
                    <span class="detail-year">${movie.anio_estreno || '2024'}</span>
                    <h2>${movie.titulo}</h2>
                    <p>${movie.sinopsis || 'Sinopsis no disponible.'}</p>
                    
                    <div class="detail-actions">
                        <button onclick="voteMovie(${movie.idpelicula}, 'like')" class="action-button action-like">
                            <span aria-hidden="true">▲</span> Like
                        </button>
                        <button onclick="voteMovie(${movie.idpelicula}, 'dislike')" class="action-button action-dislike">
                            <span aria-hidden="true">▼</span> Dislike
                        </button>
                        <button onclick="updateMovie(${movie.idpelicula})" class="action-button action-edit">
                            <span aria-hidden="true">✎</span> Actualizar
                        </button>
                        <button onclick="deleteMovie(${movie.idpelicula})" class="action-button action-delete">
                            <span aria-hidden="true">×</span> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
        navigateTo('detail');
    } catch (e) {
        showNotification("No se pudo cargar el detalle", "error");
    }
}

async function voteMovie(id, type) {
    try {
        await apiRequest(`/peliculas/${id}/votar`, 'POST', { tipo: type });
        showNotification(`Voto ${type} registrado con éxito`);
    } catch (e) {
        showNotification("Error al registrar voto", "error");
    }
}

async function updateMovie(id) {
    const newTitle = prompt("Nuevo título para la obra:");
    if (!newTitle) return;
    try {
        await apiRequest(`/peliculas/${id}`, 'PUT', { titulo: newTitle });
        showNotification("Película actualizada correctamente");
        loadInitialData();
        navigateTo('home');
    } catch (e) {
        showNotification("Error al actualizar", "error");
    }
}

async function deleteMovie(id) {
    if (!confirm("¿Estás seguro de eliminar esta película?")) return;
    try {
        await apiRequest(`/peliculas/${id}`, 'DELETE');
        showNotification("Película eliminada");
        loadInitialData();
        navigateTo('home');
    } catch (e) {
        showNotification("Error al eliminar", "error");
    }
}

function filterMedia() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const cat = document.getElementById('category-filter').value;

    const filtered = appState.movies.filter(m => {
        const matchesQuery = m.titulo.toLowerCase().includes(query) || m.sinopsis.toLowerCase().includes(query);
        const matchesCat = cat === 'ALL' || m.idcategoria == cat;
        return matchesQuery && matchesCat;
    });

    renderMediaGrid(filtered);
}

function renderCategoryFilters() {
    const select = document.getElementById('category-filter');
    const mediaSelect = document.getElementById('media-category');
    
    const options = appState.categories.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    if(select) select.innerHTML = `<option value="ALL">Todas las Categorías</option>` + options;
    if(mediaSelect) mediaSelect.innerHTML = options;
}

function renderCategoriesView() {
    const grid = document.getElementById('categories-grid');
    if(!grid) return;
    grid.innerHTML = appState.categories.map(c => `
        <button class="category-card" type="button" onclick="filterByCategory(${c.id})">
            <span class="category-icon" aria-hidden="true">▦</span>
            <h3>${c.nombre}</h3>
        </button>
    `).join('');
}

function filterByCategory(catId) {
    document.getElementById('category-filter').value = catId;
    filterMedia();
    navigateTo('home');
}

function renderCastView() {
    const dirs = document.getElementById('directors-list');
    const acts = document.getElementById('actors-list');
    if(dirs) dirs.innerHTML = appState.directors.map(d => `<div class="cast-item">${d.nombre} ${d.apellido || ''}</div>`).join('');
    if(acts) acts.innerHTML = appState.actors.map(a => `<div class="cast-item">${a.nombre} ${a.apellido || ''}</div>`).join('');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const contrasena = document.getElementById('login-password').value;
    try {
        const res = await apiRequest('/auth/login', 'POST', { email, contrasena });
        localStorage.setItem('jwt_token', res.token);
        appState.currentUser = res.usuario;
        document.getElementById('user-name-display').textContent = res.usuario.nombre;
        document.getElementById('user-role-pill').textContent = res.usuario.role.toUpperCase();
        if(res.usuario.role === 'administrador') {
            document.getElementById('nav-admin').classList.remove('hidden');
        }
        closeAuthModal();
        showNotification("Sesión iniciada con éxito");
    } catch (e) {
        showNotification("Credenciales inválidas", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const nombre = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const contrasena = document.getElementById('reg-password').value;
    try {
        await apiRequest('/auth/register', 'POST', { nombre, email, contrasena });
        closeAuthModal();
        showNotification("Registro exitoso. Inicia sesión.");
        switchAuthTab('login');
    } catch (e) {
        showNotification("Error en el registro", "error");
    }
}

async function handleAddMedia(e) {
    e.preventDefault();
    const titulo = document.getElementById('media-title').value;
    const idcategoria = document.getElementById('media-category').value;
    const anio_estreno = document.getElementById('media-year').value;
    const imagen = document.getElementById('media-image').value;
    const sinopsis = document.getElementById('media-description').value;

    try {
        await apiRequest('/peliculas', 'POST', { titulo, idcategoria, anio_estreno, imagen, sinopsis });
        loadInitialData();
        navigateTo('home');
        showNotification("Propuesta enviada correctamente");
    } catch (e) {
        showNotification("Error al enviar propuesta", "error");
    }
}