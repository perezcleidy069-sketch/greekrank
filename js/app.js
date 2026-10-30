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
        grid.innerHTML = `<p class="text-gray-500 text-xs col-span-full text-center py-8">No hay elementos disponibles.</p>`;
        return;
    }
    grid.innerHTML = items.map(m => `
        <div class="bg-cardBg border border-gray-800 rounded-xl overflow-hidden hover:border-goldAccent/50 transition cursor-pointer" onclick="showDetail(${m.idpelicula})">
            <img src="${m.imagen || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}" class="w-full h-48 object-cover">
            <div class="p-4">
                <span class="text-[10px] text-goldAccent font-bold uppercase">Película / Serie</span>
                <h3 class="text-lg font-bold text-white mt-1">${m.titulo}</h3>
                <p class="text-xs text-gray-400 mt-1 line-clamp-2">${m.sinopsis}</p>
            </div>
        </div>
    `).join('');
}

async function showDetail(id) {
    try {
        const res = await apiRequest(`/peliculas/${id}`);
        const movie = res.data || res;

        const detailCard = document.getElementById('detail-card');
        detailCard.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6">
                <img src="${movie.imagen || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}" class="w-full md:w-64 h-80 object-cover rounded-xl">
                <div class="flex-grow space-y-4">
                    <span class="text-xs font-bold text-goldAccent uppercase">${movie.anio_estreno || '2024'}</span>
                    <h2 class="text-3xl font-display font-extrabold text-white">${movie.titulo}</h2>
                    <p class="text-gray-300 text-sm">${movie.sinopsis}</p>
                    
                    <div class="flex items-center gap-4 pt-2 border-t border-gray-800 flex-wrap">
                        <button onclick="voteMovie(${movie.idpelicula}, 'like')" class="flex items-center gap-2 bg-darkBg border border-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl text-xs hover:bg-emerald-500 hover:text-black transition">
                            <i class="fa-solid fa-thumbs-up"></i> <span>Like</span>
                        </button>
                        <button onclick="voteMovie(${movie.idpelicula}, 'dislike')" class="flex items-center gap-2 bg-darkBg border border-rose-500/40 text-rose-400 px-4 py-2 rounded-xl text-xs hover:bg-rose-500 hover:text-black transition">
                            <i class="fa-solid fa-thumbs-down"></i> <span>Dislike</span>
                        </button>
                        <button onclick="updateMovie(${movie.idpelicula})" class="bg-darkBg border border-goldAccent/40 text-goldAccent px-4 py-2 rounded-xl text-xs hover:bg-goldAccent hover:text-black transition">
                            <i class="fa-solid fa-pen"></i> Actualizar
                        </button>
                        <button onclick="deleteMovie(${movie.idpelicula})" class="bg-darkBg border border-red-500/40 text-red-400 px-4 py-2 rounded-xl text-xs hover:bg-red-500 hover:text-white transition">
                            <i class="fa-solid fa-trash"></i> Eliminar
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
        <div class="bg-cardBg border border-gray-800 p-4 rounded-xl text-center hover:border-goldAccent cursor-pointer" onclick="filterByCategory(${c.id})">
            <i class="fa-solid fa-film text-2xl text-goldAccent mb-2"></i>
            <h4 class="text-white font-bold text-sm">${c.nombre}</h4>
        </div>
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
    if(dirs) dirs.innerHTML = appState.directors.map(d => `<div class="bg-cardBg p-3 rounded-xl text-xs text-white border border-gray-800"><i class="fa-solid fa-clapperboard text-goldAccent mr-2"></i>${d.nombre} ${d.apellido || ''}</div>`).join('');
    if(acts) acts.innerHTML = appState.actors.map(a => `<div class="bg-cardBg p-3 rounded-xl text-xs text-white border border-gray-800"><i class="fa-solid fa-user-ninja text-neonBlue mr-2"></i>${a.nombre} ${a.apellido || ''}</div>`).join('');
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