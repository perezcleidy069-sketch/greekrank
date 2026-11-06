const appState = {
    movies: [],
    categories: [],
    directors: [],
    actors: [],
    adminRequests: [],
    currentUser: null,
    activeMovie: null
};

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    const token = localStorage.getItem('jwt_token');
    if (token) {
        try {
            const response = await apiRequest('/auth/me');
            setCurrentUser(response.usuario);
        } catch (error) {
            if (error.status === 401) {
                localStorage.removeItem('jwt_token');
                showNotification('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
            }
        }
    }

    renderCreationOptions();
    await loadInitialData();
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function imageUrl(value) {
    if (!value) return '';
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (error) {
        return '';
    }
}

function imageMarkup(url, alt, className, fallbackUrl = '') {
    const safeUrl = imageUrl(url);
    const safeFallbackUrl = imageUrl(fallbackUrl);
    const source = safeUrl || safeFallbackUrl;
    const fallbackAttribute = safeUrl && safeFallbackUrl && safeUrl !== safeFallbackUrl
        ? ` data-fallback="${escapeHTML(safeFallbackUrl)}"`
        : '';
    return `<img${source ? ` src="${escapeHTML(source)}"` : ''}${fallbackAttribute} alt="${escapeHTML(alt)}" class="${className}" loading="lazy">`;
}

document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;

    if (image.dataset.fallback && !image.dataset.fallbackUsed) {
        image.dataset.fallbackUsed = 'true';
        image.src = image.dataset.fallback;
        return;
    }

    if (image.classList.contains('person-photo')) {
        const avatar = document.createElement('span');
        avatar.className = 'person-avatar';
        avatar.setAttribute('role', 'img');
        avatar.setAttribute('aria-label', image.alt);
        avatar.textContent = '♟';
        image.replaceWith(avatar);
        return;
    }

    image.classList.add('image-unavailable');
}, true);

function categoryImageFor(movie) {
    return appState.categories.find(category =>
        Number(category.id) === Number(movie.idcategoria)
    )?.imagen_url || '';
}

function asArray(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    throw new Error('La API devolvió una respuesta de catálogo no válida.');
}

async function loadInitialData() {
    try {
        const [moviesResponse, categoriesResponse, directorsResponse, actorsResponse] = await Promise.all([
            apiRequest('/peliculas?limit=100'),
            apiRequest('/categorias'),
            apiRequest('/directores'),
            apiRequest('/actores')
        ]);

        appState.movies = asArray(moviesResponse);
        appState.categories = asArray(categoriesResponse);
        appState.directors = asArray(directorsResponse);
        appState.actors = asArray(actorsResponse);

        renderCategoryFilters();
        renderMediaGrid(filterMovies());
        renderRankingView();
        renderCategoriesView();
        renderCastView();
        renderPendingMovies();
        await loadAdminRequests();
    } catch (error) {
        console.error('Error cargando los datos de la API:', error);
        document.getElementById('media-grid').innerHTML =
            `<p class="empty-state">No se pudieron cargar las películas. ${escapeHTML(error.message)}</p>`;
        showNotification(error.message, 'error');
    }
}

function filterMovies() {
    const query = document.getElementById('search-input').value.trim().toLocaleLowerCase();
    const categoryId = document.getElementById('category-filter').value;

    return appState.movies.filter(movie => {
        const categoryMatches = categoryId === 'ALL' || String(movie.idcategoria) === categoryId;
        const searchText = [
            movie.titulo,
            movie.sinopsis,
            movie.categoria,
            movie.director,
            movie.apellido_director
        ].filter(Boolean).join(' ').toLocaleLowerCase();
        return categoryMatches && searchText.includes(query);
    });
}

function renderMediaGrid(movies, gridId = 'media-grid', showPosition = false) {
    const grid = document.getElementById(gridId);
    if (!movies.length) {
        grid.innerHTML = '<p class="empty-state">No hay películas o series disponibles con estos filtros.</p>';
        return;
    }

    grid.innerHTML = movies.map((movie, index) => {
        const id = Number(movie.idpelicula);
        if (!Number.isInteger(id) || id < 1) return '';
        const type = movie.tipo === 'serie' ? 'Serie' : 'Película';
        return `
            <article class="media-card" onclick="showDetail(${id})" tabindex="0"
                onkeydown="if(event.target === this && (event.key === 'Enter' || event.key === ' ')) showDetail(${id})">
                ${showPosition ? `<span class="ranking-position">#${index + 1}</span>` : ''}
                ${imageMarkup(movie.imagen, `Póster de ${movie.titulo}`, 'media-poster', categoryImageFor(movie))}
                <div class="media-copy">
                    <span class="media-type">${escapeHTML(movie.categoria || type)}</span>
                    <h3>${escapeHTML(movie.titulo)}</h3>
                    <p>${escapeHTML(movie.sinopsis || 'Sinopsis no disponible.')}</p>
                    <div class="media-meta">
                        <span>${escapeHTML(movie.anio_estreno || '')}</span>
                        <span>★ ${escapeHTML(movie.calificacion_promedio ?? '0.00')} · ${escapeHTML(movie.total_resenas ?? 0)} reseñas</span>
                    </div>
                    ${Number(movie.total_resenas) > 0
                        ? `<div class="media-ranking">🏆 Ranking: ${escapeHTML(movie.ranking ?? '0.00')}</div>`
                        : ''}
                    ${renderMovieVoteButtons(movie, 'media-movie-votes')}
                    <button class="button button-cyan media-review-button" type="button"
                        onclick="openReview(${id}, event)">Escribir reseña</button>
                </div>
            </article>
        `;
    }).join('');

}

function renderRankingView() {
    const rankedMovies = appState.movies
        .filter(movie => Number(movie.total_resenas) > 0)
        .sort((first, second) =>
            Number(second.ranking || 0) - Number(first.ranking || 0) ||
            Number(second.total_resenas || 0) - Number(first.total_resenas || 0) ||
            String(first.titulo || '').localeCompare(String(second.titulo || ''), 'es')
        )
        .slice(0, 10);
    if (!rankedMovies.length) {
        document.getElementById('ranking-grid').innerHTML = '<p class="empty-state">No hay ranking</p>';
        return;
    }
    renderMediaGrid(rankedMovies, 'ranking-grid', true);
}

async function showDetail(id) {
    try {
        const response = await apiRequest(`/peliculas/${Number(id)}`);
        const movie = response?.data || response;
        appState.activeMovie = movie;
        renderMovieDetail(movie);
        navigateTo('detail');
    } catch (error) {
        showNotification(error.message || 'No se pudo cargar el detalle.', 'error');
    }
}

async function openReview(id, event) {
    event.stopPropagation();
    await showDetail(id);
    const reviewsSection = document.getElementById('reviews-section');
    if (!reviewsSection || document.getElementById('view-detail').classList.contains('hidden')) return;

    reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const reviewTitle = document.getElementById('review-title');
    if (reviewTitle) {
        reviewTitle.focus({ preventScroll: true });
    } else {
        document.getElementById('review-login-button')?.focus({ preventScroll: true });
    }
}

function renderMovieVoteButtons(movie, className) {
    const userVote = movie.mi_voto || null;
    const label = appState.currentUser ? '' : ' · Inicia sesión';
    return `
        <div class="movie-votes ${className}">
            <button class="action-button action-like movie-vote-button${userVote === 'like' ? ' is-voted' : ''}"
                type="button" aria-pressed="${userVote === 'like'}"
                onclick="voteMovie(${Number(movie.idpelicula)}, 'like', event)">
                👍 ${escapeHTML(movie.likes_pelicula ?? 0)} · ${userVote === 'like' ? 'Te gusta' : 'Me gusta'}${label}
            </button>
            <button class="action-button action-dislike movie-vote-button${userVote === 'dislike' ? ' is-voted' : ''}"
                type="button" aria-pressed="${userVote === 'dislike'}"
                onclick="voteMovie(${Number(movie.idpelicula)}, 'dislike', event)">
                👎 ${escapeHTML(movie.dislikes_pelicula ?? 0)} · ${userVote === 'dislike' ? 'No te gusta' : 'No me gusta'}${label}
            </button>
        </div>
    `;
}

async function voteMovie(movieId, vote, event) {
    event?.stopPropagation();
    if (!appState.currentUser) {
        showNotification('Inicia sesión para votar esta película.', 'error');
        openLoginModal();
        return;
    }

    const id = Number(movieId);
    const movie = Number(appState.activeMovie?.idpelicula) === id
        ? appState.activeMovie
        : appState.movies.find(item => Number(item.idpelicula) === id);
    const removingVote = movie?.mi_voto === vote;

    try {
        const response = await apiRequest(
            `/peliculas/${id}/votos`,
            removingVote ? 'DELETE' : 'POST',
            removingVote ? null : { voto: vote }
        );
        showNotification(response.mensaje || (removingVote
            ? 'Quitaste tu voto de esta película.'
            : vote === 'like' ? 'Te gusta esta película.' : 'No te gusta esta película.'));
        await loadInitialData();
        if (Number(appState.activeMovie?.idpelicula) === id) {
            await showDetail(id);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function renderMovieDetail(movie) {
    const id = Number(movie.idpelicula);
    const isSignedIn = Boolean(appState.currentUser);
    const canManage = isSignedIn && (
        appState.currentUser.role === 'administrador' || movie.puede_gestionar === true
    );
    const reviews = Array.isArray(movie.resenas) ? movie.resenas : [];
    const director = [movie.director, movie.apellido_director].filter(Boolean).join(' ');
    const trailerUrl = imageUrl(movie.trailer_url);

    document.getElementById('detail-card').innerHTML = `
        <div class="detail-layout">
            ${imageMarkup(movie.imagen, `Póster de ${movie.titulo}`, 'detail-poster', categoryImageFor(movie))}
            <div class="detail-copy">
                <span class="detail-year">${escapeHTML(movie.anio_estreno || '')} · ${escapeHTML(movie.tipo === 'serie' ? 'Serie' : 'Película')}</span>
                <h2>${escapeHTML(movie.titulo)}</h2>
                <p>${escapeHTML(movie.sinopsis || 'Sinopsis no disponible.')}</p>
                <div class="movie-stats">
                    <span>★ ${escapeHTML(movie.calificacion_promedio ?? '0.00')} / 10</span>
                    <span>${escapeHTML(movie.total_resenas ?? 0)} reseñas</span>
                    ${Number(movie.total_resenas) > 0
                        ? `<span>🏆 Ranking: ${escapeHTML(movie.ranking ?? '0.00')}</span>`
                        : ''}
                    <span>${escapeHTML(movie.categoria || 'Sin categoría')}</span>
                    ${director ? `<span>Dir. ${escapeHTML(director)}</span>` : ''}
                </div>
                <div class="movie-stats">
                    <span>👍 ${escapeHTML(movie.likes_pelicula ?? 0)} likes de película</span>
                    <span>👎 ${escapeHTML(movie.dislikes_pelicula ?? 0)} dislikes de película</span>
                </div>
                ${renderMovieVoteButtons(movie, 'detail-movie-votes')}
                ${trailerUrl ? `<a class="trailer-link" href="${escapeHTML(trailerUrl)}" target="_blank" rel="noopener noreferrer">Ver tráiler ↗</a>` : ''}
                <button class="button button-cyan detail-review-button" type="button"
                    onclick="document.getElementById('reviews-section').scrollIntoView({ behavior: 'smooth', block: 'start' })">
                    Escribir reseña
                </button>
                ${canManage ? `
                    <div class="detail-actions">
                        <button onclick="updateMovie(${id})" class="action-button action-edit" type="button">Actualizar</button>
                        <button onclick="deleteMovie(${id})" class="action-button action-delete" type="button">Eliminar</button>
                    </div>
                ` : isSignedIn
                    ? '<p class="login-hint">Solo puedes actualizar o eliminar las obras que propusiste. Un administrador también puede gestionarlas.</p>'
                    : '<p class="login-hint">Inicia sesión para actualizar o eliminar tus propuestas.</p>'}
            </div>
        </div>
        <section id="reviews-section" class="reviews-section">
            <div class="section-heading">
                <p class="eyebrow">Opiniones de la comunidad</p>
                <h3>Reseñas (${reviews.length})</h3>
            </div>
            ${renderReviewForm(id)}
            <div class="reviews-list">${renderReviews(reviews)}</div>
        </section>
    `;

}

function renderReviewForm(movieId) {
    if (!appState.currentUser) {
        return `
            <div class="login-hint">
                <p>Inicia sesión para dejar una reseña y calificar esta obra.</p>
                <button id="review-login-button" class="button button-gold" type="button" onclick="openLoginModal()">
                    Iniciar sesión para reseñar
                </button>
            </div>
        `;
    }

    return `
        <form class="review-form" onsubmit="handleReviewSubmit(event, ${movieId})">
            <label for="review-title">Título de la reseña</label>
            <input id="review-title" name="titulo" maxlength="150" required>
            <label for="review-score">Calificación</label>
            <select id="review-score" name="puntaje" required>
                ${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}">${index + 1} / 10</option>`).join('')}
            </select>
            <label for="review-comments">Tu opinión</label>
            <textarea id="review-comments" name="comentarios" maxlength="5000" rows="4" required></textarea>
            <button type="submit" class="button button-cyan">Publicar reseña</button>
        </form>
    `;
}

function renderReviews(reviews) {
    if (!reviews.length) return '<p class="empty-state">Todavía no hay reseñas para esta obra.</p>';

    return reviews.map(review => {
        const id = Number(review.id);
        const isOwnReview = appState.currentUser &&
            Number(appState.currentUser.id) === Number(review.idusuario);
        const canVote = appState.currentUser && !isOwnReview;
        const date = review.fechaResena ? new Date(review.fechaResena).toLocaleDateString('es-MX') : '';
        return `
            <article class="review-card">
                <div class="review-heading">
                    <div>
                        <h4>${escapeHTML(review.titulo || 'Reseña')}</h4>
                        <span>${escapeHTML(review.usuario || 'Usuario')}${date ? ` · ${escapeHTML(date)}` : ''}</span>
                    </div>
                    <strong>★ ${escapeHTML(review.puntaje)} / 10</strong>
                </div>
                <p>${escapeHTML(review.comentarios)}</p>
                <div class="review-votes">
                    <span>👍 ${escapeHTML(review.likes ?? 0)}</span>
                    <span>👎 ${escapeHTML(review.dislikes ?? 0)}</span>
                    ${canVote ? `
                        <button type="button" class="action-button action-like" onclick="voteReview(${id}, 'like')">Me gusta</button>
                        <button type="button" class="action-button action-dislike" onclick="voteReview(${id}, 'dislike')">No me gusta</button>
                    ` : isOwnReview
                        ? '<span class="review-vote-note">No puedes votar tu propia reseña</span>'
                        : '<button type="button" class="action-button action-like" onclick="openLoginModal()">Inicia sesión para votar</button>'}
                </div>
            </article>
        `;
    }).join('');
}

async function handleReviewSubmit(event, movieId) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
        await apiRequest('/resenas', 'POST', {
            idpelicula: Number(movieId),
            titulo: formData.get('titulo').trim(),
            comentarios: formData.get('comentarios').trim(),
            puntaje: Number(formData.get('puntaje'))
        });
        showNotification('Tu reseña se publicó correctamente.');
        await loadInitialData();
        await showDetail(movieId);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function voteReview(reviewId, vote) {
    try {
        await apiRequest(`/resenas/${Number(reviewId)}/votos`, 'POST', { voto: vote });
        showNotification('Tu voto se registró correctamente.');
        if (appState.activeMovie) {
            const movieId = appState.activeMovie.idpelicula;
            await loadInitialData();
            await showDetail(movieId);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function updateMovie(id) {
    const movie = appState.activeMovie;
    if (!movie || Number(movie.idpelicula) !== Number(id)) return;

    const title = prompt('Nuevo título:', movie.titulo);
    if (!title?.trim()) return;

    try {
        const response = await apiRequest(`/peliculas/${Number(id)}`, 'PUT', {
            titulo: title.trim(),
            sinopsis: movie.sinopsis,
            anio_estreno: Number(movie.anio_estreno),
            duracion_minutos: movie.duracion_minutos || null,
            idcategoria: Number(movie.idcategoria),
            iddirector: movie.iddirector || null,
            imagen: movie.imagen || null,
            trailer_url: movie.trailer_url || null,
            tipo: movie.tipo || 'pelicula'
        });
        showNotification(response.mensaje || 'La película se actualizó correctamente.');
        await loadInitialData();
        await showDetail(id);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deleteMovie(id) {
    if (!confirm('¿Estás seguro de eliminar esta película?')) return;
    try {
        const response = await apiRequest(`/peliculas/${Number(id)}`, 'DELETE');
        showNotification(response.mensaje || 'Película eliminada.');
        appState.activeMovie = null;
        await loadInitialData();
        navigateTo('home');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function filterMedia() {
    renderMediaGrid(filterMovies());
}

function renderCategoryFilters() {
    const filter = document.getElementById('category-filter');
    const proposalSelect = document.getElementById('media-category');
    const selectedCategory = filter.value || 'ALL';

    filter.innerHTML = '<option value="ALL">Todas las categorías</option>' +
        appState.categories.map(category =>
            `<option value="${Number(category.id)}">${escapeHTML(category.nombre)}</option>`
        ).join('');
    filter.value = selectedCategory;

    proposalSelect.innerHTML = appState.categories.length
        ? '<option value="" disabled selected>Selecciona una categoría</option>' +
            appState.categories.map(category =>
                `<option value="${Number(category.id)}">${escapeHTML(category.nombre)}</option>`
            ).join('')
        : '<option value="" disabled selected>No hay categorías disponibles</option>';

    const directorSelect = document.getElementById('media-director');
    directorSelect.innerHTML = '<option value="">Sin especificar</option>' +
        appState.directors.map(director =>
            `<option value="${Number(director.id)}">${escapeHTML([director.nombre, director.apellido].filter(Boolean).join(' '))}</option>`
        ).join('');
}

function renderCategoriesView() {
    const grid = document.getElementById('categories-grid');
    if (!appState.categories.length) {
        grid.innerHTML = '<p class="empty-state">La API todavía no tiene categorías.</p>';
        return;
    }

    grid.innerHTML = appState.categories.map(category => {
        const id = Number(category.id);
        return `
            <article class="category-card">
                <button class="category-card-main" type="button" onclick="filterByCategory(${id})">
                    ${category.imagen_url
                        ? imageMarkup(category.imagen_url, '', 'category-image')
                        : '<span class="category-icon" aria-hidden="true">▦</span>'}
                    <h3>${escapeHTML(category.nombre)}</h3>
                </button>
                ${renderCatalogActions('category', id)}
            </article>
        `;
    }).join('');
}

function filterByCategory(categoryId) {
    document.getElementById('category-filter').value = String(categoryId);
    filterMedia();
    navigateTo('home');
}

function renderCastView() {
    document.getElementById('directors-count').textContent = `${appState.directors.length} disponibles`;
    document.getElementById('actors-count').textContent = `${appState.actors.length} disponibles`;
    showCastHome();
}

function showCastHome() {
    document.getElementById('cast-groups').classList.remove('hidden');
    document.getElementById('cast-people-panel').classList.add('hidden');
    document.getElementById('cast-movies-panel').classList.add('hidden');
}

function openCastGroup(group) {
    if (!['directors', 'actors'].includes(group)) return;

    const people = appState[group];
    const isDirector = group === 'directors';
    document.getElementById('cast-groups').classList.add('hidden');
    document.getElementById('cast-movies-panel').classList.add('hidden');
    document.getElementById('cast-people-panel').classList.remove('hidden');
    document.getElementById('cast-people-title').textContent = isDirector ? 'Directores' : 'Actores';

    const list = document.getElementById('cast-people-list');
    list.innerHTML = people.length
        ? people.map(person => renderCastMember(person, isDirector)).join('')
        : `<p class="empty-state">La API todavía no tiene ${isDirector ? 'directores' : 'actores'}.</p>`;
}

function renderCastMember(person, isDirector) {
    const id = Number(person.id);
    if (!Number.isInteger(id) || id < 1) return '';

    const name = [person.nombre, person.apellido].filter(Boolean).join(' ');
    const picture = imageUrl(person.foto_url);
    const personContent = `
        ${picture
            ? imageMarkup(picture, `Foto de ${name}`, 'person-photo')
            : '<span class="person-avatar" aria-hidden="true">♟</span>'}
        <span class="person-name">${escapeHTML(name)}</span>
        ${isDirector ? '<span class="person-hint">Ver películas y series →</span>' : ''}
    `;
    const content = isDirector
        ? `<button class="person-card-main" type="button" onclick="showDirectorMovies(${id})">${personContent}</button>`
        : personContent;

    return `
        <article class="person-card">
            ${content}
            ${renderCatalogActions(isDirector ? 'director' : 'actor', id)}
        </article>
    `;
}

function renderCatalogActions(type, id) {
    if (appState.currentUser?.role !== 'administrador') return '';
    return `
        <div class="catalog-actions">
            <button class="action-button action-edit" type="button" onclick="updateCatalog('${type}', ${id})">Actualizar</button>
            <button class="action-button action-delete" type="button" onclick="deleteCatalog('${type}', ${id})">Eliminar</button>
        </div>
    `;
}

function getCatalogConfig(type) {
    return {
        category: {
            endpoint: '/categorias',
            label: 'categoría',
            imageField: 'imagen_url',
            hasSurname: false
        },
        director: {
            endpoint: '/directores',
            label: 'director',
            imageField: 'foto_url',
            hasSurname: true
        },
        actor: {
            endpoint: '/actores',
            label: 'actor',
            imageField: 'foto_url',
            hasSurname: true
        }
    }[type];
}

async function updateCatalog(type, id) {
    if (appState.currentUser?.role !== 'administrador') {
        showNotification('Solo un administrador puede actualizar el catálogo.', 'error');
        return;
    }

    const config = getCatalogConfig(type);
    if (!config) {
        showNotification('Selecciona un elemento válido del catálogo.', 'error');
        return;
    }
    const collection = type === 'category' ? appState.categories : appState[type === 'director' ? 'directors' : 'actors'];
    const item = collection.find(entry => Number(entry.id) === Number(id));
    if (!item) {
        showNotification('No se encontró el elemento del catálogo.', 'error');
        return;
    }

    const nombre = prompt(`Nombre de la ${config.label}:`, item.nombre);
    if (nombre === null) return;
    const imagen = prompt('URL de imagen (opcional):', item[config.imageField] || '');
    if (imagen === null) return;
    const payload = {
        nombre: nombre.trim(),
        [config.imageField]: imagen.trim() || null
    };
    if (config.hasSurname) {
        const apellido = prompt('Apellido:', item.apellido || '');
        if (apellido === null) return;
        payload.apellido = apellido.trim() || null;
    }
    if (!payload.nombre) {
        showNotification('El nombre es obligatorio.', 'error');
        return;
    }

    try {
        const response = await apiRequest(`${config.endpoint}/${Number(id)}`, 'PUT', payload);
        showNotification(response.mensaje || `Se actualizó el/la ${config.label}.`);
        await loadInitialData();
        if (type !== 'category') openCastGroup(type === 'director' ? 'directors' : 'actors');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deleteCatalog(type, id) {
    if (appState.currentUser?.role !== 'administrador') {
        showNotification('Solo un administrador puede eliminar elementos del catálogo.', 'error');
        return;
    }

    const config = getCatalogConfig(type);
    if (!config) {
        showNotification('Selecciona un elemento válido del catálogo.', 'error');
        return;
    }
    if (!confirm(`¿Seguro que deseas eliminar esta ${config.label}?`)) return;

    try {
        const response = await apiRequest(`${config.endpoint}/${Number(id)}`, 'DELETE');
        showNotification(response.mensaje || `Se eliminó el/la ${config.label}.`);
        await loadInitialData();
        if (type !== 'category') openCastGroup(type === 'director' ? 'directors' : 'actors');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function showDirectorMovies(id) {
    const director = appState.directors.find(person => Number(person.id) === Number(id));
    if (!director) {
        showNotification('No se encontró el director seleccionado.', 'error');
        return;
    }

    const name = [director.nombre, director.apellido].filter(Boolean).join(' ');
    const movies = appState.movies.filter(movie => Number(movie.iddirector) === Number(id));
    document.getElementById('director-movies-title').textContent = `Obras de ${name}`;
    document.getElementById('cast-people-panel').classList.add('hidden');
    document.getElementById('cast-movies-panel').classList.remove('hidden');
    renderMediaGrid(movies, 'director-movies-grid');
}

function renderPendingMovies() {
    const list = document.getElementById('pending-list');
    if (appState.currentUser?.role !== 'administrador') {
        list.innerHTML = '<p class="empty-state">Inicia sesión como administrador para revisar propuestas.</p>';
        return;
    }

    const pending = appState.movies.filter(movie => movie.estado === 'pendiente');
    if (!pending.length) {
        list.innerHTML = '<p class="empty-state">No hay propuestas pendientes.</p>';
        return;
    }

    list.innerHTML = pending.map(movie => {
        const id = Number(movie.idpelicula);
        return `
            <article class="pending-item">
                <div>
                    <strong>${escapeHTML(movie.titulo)}</strong>
                    <span>${escapeHTML(movie.anio_estreno)} · ${escapeHTML(movie.categoria || '')}</span>
                </div>
                <div class="pending-actions">
                    <button class="action-button action-like" type="button" onclick="setMovieApproval(${id}, 'aprobada')">Aprobar</button>
                    <button class="action-button action-delete" type="button" onclick="setMovieApproval(${id}, 'rechazada')">Rechazar</button>
                </div>
            </article>
        `;
    }).join('');
}

async function loadAdminRequests() {
    const list = document.getElementById('admin-requests-list');
    if (appState.currentUser?.role !== 'administrador') {
        appState.adminRequests = [];
        if (list) list.innerHTML = '<p class="empty-state">Inicia sesión como administrador para revisar solicitudes.</p>';
        return;
    }

    try {
        const response = await apiRequest('/usuarios/solicitudes-administrador');
        appState.adminRequests = asArray(response);
        renderAdminRequests();
    } catch (error) {
        console.error('Error cargando solicitudes de administrador:', error);
        list.innerHTML = `<p class="empty-state">No se pudieron cargar las solicitudes. ${escapeHTML(error.message)}</p>`;
        showNotification(error.message, 'error');
    }
}

function renderAdminRequests() {
    const list = document.getElementById('admin-requests-list');
    if (!list) return;
    if (!appState.adminRequests.length) {
        list.innerHTML = '<p class="empty-state">No hay solicitudes pendientes.</p>';
        return;
    }

    list.innerHTML = appState.adminRequests.map(user => `
        <article class="pending-item">
            <div>
                <strong>${escapeHTML(user.nombre)}${user.apellido ? ` ${escapeHTML(user.apellido)}` : ''}</strong>
                <span>${escapeHTML(user.email)}</span>
            </div>
            <div class="pending-actions">
                <button class="action-button action-like" type="button" onclick="resolveAdminRequest(${Number(user.id)}, 'aprobada')">Aprobar</button>
                <button class="action-button action-delete" type="button" onclick="resolveAdminRequest(${Number(user.id)}, 'rechazada')">Rechazar</button>
            </div>
        </article>
    `).join('');
}

async function resolveAdminRequest(userId, estado) {
    if (appState.currentUser?.role !== 'administrador') {
        showNotification('Solo un administrador puede resolver estas solicitudes.', 'error');
        return;
    }

    try {
        const response = await apiRequest(
            `/usuarios/solicitudes-administrador/${Number(userId)}`,
            'PATCH',
            { estado }
        );
        showNotification(response.mensaje || `Solicitud ${estado}.`);
        await loadAdminRequests();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function setMovieApproval(id, state) {
    try {
        const response = await apiRequest(`/peliculas/${Number(id)}/aprobacion`, 'PATCH', { estado: state });
        showNotification(response.mensaje || `Propuesta ${state}.`);
        await loadInitialData();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function setCurrentUser(user) {
    appState.currentUser = user || null;
    const badge = document.getElementById('user-badge');
    const name = document.getElementById('user-name-display');
    const role = document.getElementById('user-role-pill');
    const authButton = document.getElementById('auth-action-btn');

    if (!user) {
        badge.classList.add('hidden');
        authButton.innerHTML = '<span aria-hidden="true">↪</span><span>Sesión</span>';
        authButton.onclick = openAuthModal;
        document.getElementById('nav-admin').classList.add('hidden');
        renderCreationOptions();
        renderPendingMovies();
        return;
    }

    badge.classList.remove('hidden');
    name.textContent = user.nombre || user.email || 'Usuario';
    role.textContent = (user.role || 'usuario').toUpperCase();
    authButton.innerHTML = '<span aria-hidden="true">↪</span><span>Salir</span>';
    authButton.onclick = handleLogout;
    document.getElementById('nav-admin').classList.toggle('hidden', user.role !== 'administrador');
    renderCreationOptions();
    renderPendingMovies();
}

function handleAuthAction() {
    if (appState.currentUser) {
        handleLogout();
        return;
    }
    openAuthModal();
}

function handleLogout() {
    localStorage.removeItem('jwt_token');
    setCurrentUser(null);
    appState.activeMovie = null;
    showNotification('Sesión cerrada.');
    loadInitialData();
    navigateTo('home');
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const contrasena = document.getElementById('login-password').value;
    const codigoAdministrador = document.getElementById('login-admin-code').value.trim();

    try {
        const payload = { email, contrasena };
        if (codigoAdministrador) payload.codigo_administrador = codigoAdministrador;
        const response = await apiRequest('/auth/login', 'POST', payload);
        if (!response?.token || !response?.usuario) {
            throw new Error('La API no devolvió los datos de sesión esperados.');
        }
        localStorage.setItem('jwt_token', response.token);
        document.getElementById('login-admin-code').value = '';
        setCurrentUser(response.usuario);
        closeAuthModal();
        showNotification('Sesión iniciada correctamente.');
        await loadInitialData();
        if (appState.activeMovie) {
            await showDetail(appState.activeMovie.idpelicula);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creando cuenta...';

    try {
        const nombre = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const contrasena = document.getElementById('reg-password').value;
        const requestAdmin = document.getElementById('register-admin-type').getAttribute('aria-pressed') === 'true';
        const payload = {
            nombre,
            email,
            contrasena,
            solicitar_administrador: requestAdmin
        };
        if (requestAdmin) {
            payload.codigo_administrador = document.getElementById('reg-admin-code').value.trim();
        }
        const response = await apiRequest('/auth/register', 'POST', payload);
        closeAuthModal();
        switchAuthTab('login');
        document.getElementById('form-register').reset();
        selectRegistrationType('usuario');
        showNotification(response.mensaje || 'Registro exitoso. Inicia sesión.');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

async function handleAddMedia(event) {
    event.preventDefault();
    const payload = {
        titulo: document.getElementById('media-title').value.trim(),
        sinopsis: document.getElementById('media-description').value.trim(),
        anio_estreno: Number(document.getElementById('media-year').value),
        idcategoria: Number(document.getElementById('media-category').value),
        iddirector: Number(document.getElementById('media-director').value) || null,
        imagen: document.getElementById('media-image').value.trim() || null,
        tipo: document.getElementById('media-type').value
    };

    try {
        const response = await apiRequest('/peliculas', 'POST', payload);
        document.getElementById('add-media-form').reset();
        showNotification(response.mensaje || 'Propuesta enviada correctamente.');
        await loadInitialData();
        navigateTo('home');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function renderCreationOptions() {
    const select = document.getElementById('creation-type');
    if (!select) return;

    const currentValue = select.value || 'movie';
    const options = [
        ['movie', 'Proponer película o serie'],
        ['category', 'Crear categoría'],
        ['director', 'Crear director'],
        ['actor', 'Crear actor']
    ];

    select.innerHTML = options.map(([value, label]) =>
        `<option value="${value}">${label}</option>`
    ).join('');
    select.value = options.some(([value]) => value === currentValue) ? currentValue : 'movie';
    document.getElementById('creation-auth-note').classList.toggle('hidden', Boolean(appState.currentUser));
    handleCreationTypeChange();
}

function handleCreationTypeChange() {
    const type = document.getElementById('creation-type').value;
    const isCatalog = type !== 'movie';
    const isAdmin = appState.currentUser?.role === 'administrador';
    const moviePanel = document.getElementById('movie-form-panel');
    const catalogPanel = document.getElementById('catalog-form-panel');
    const permissionNote = document.getElementById('catalog-permission-note');

    moviePanel.classList.toggle('hidden', isCatalog);
    catalogPanel.classList.toggle('hidden', !isCatalog || !isAdmin);
    permissionNote.classList.toggle('hidden', !isCatalog || isAdmin);

    if (isCatalog && !isAdmin) {
        permissionNote.textContent = appState.currentUser
            ? 'Solo un administrador puede crear categorías, directores y actores.'
            : 'Inicia sesión con una cuenta de administrador para crear categorías, directores o actores.';
        return;
    }
    permissionNote.textContent = '';
    if (!isCatalog) return;

    const hasSurname = type !== 'category';
    document.getElementById('catalog-surname-field').classList.toggle('hidden', !hasSurname);
    document.getElementById('catalog-surname').required = false;
    if (!hasSurname) document.getElementById('catalog-surname').value = '';
    document.getElementById('catalog-image-label').textContent =
        type === 'category' ? 'Imagen de categoría (opcional)' : 'Foto (opcional)';
    document.getElementById('catalog-submit').textContent = type === 'category'
        ? 'Crear categoría'
        : type === 'director' ? 'Crear director' : 'Crear actor';
}

async function handleAddCatalog(event) {
    event.preventDefault();
    if (appState.currentUser?.role !== 'administrador') {
        showNotification('Solo un administrador puede crear elementos del catálogo.', 'error');
        return;
    }

    const type = document.getElementById('creation-type').value;
    const catalogConfig = {
        category: { endpoint: '/categorias', imageField: 'imagen_url', hasSurname: false, label: 'categoría' },
        director: { endpoint: '/directores', imageField: 'foto_url', hasSurname: true, label: 'director' },
        actor: { endpoint: '/actores', imageField: 'foto_url', hasSurname: true, label: 'actor' }
    }[type];
    if (!catalogConfig) {
        showNotification('Selecciona una opción válida del catálogo.', 'error');
        return;
    }

    const payload = {
        nombre: document.getElementById('catalog-name').value.trim(),
        [catalogConfig.imageField]: document.getElementById('catalog-image').value.trim() || null
    };
    if (catalogConfig.hasSurname) {
        payload.apellido = document.getElementById('catalog-surname').value.trim() || null;
    }

    try {
        const response = await apiRequest(catalogConfig.endpoint, 'POST', payload);
        document.getElementById('add-catalog-form').reset();
        showNotification(response.mensaje || `Se creó el registro de ${catalogConfig.label}.`);
        await loadInitialData();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}
