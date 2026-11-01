# GeekRank

Frontend de GeekRank hecho con HTML, CSS y JavaScript nativo. Consume la API Karen Flix en `/api/v1`; no necesita frameworks ni librerías de frontend.

## Conectar con la API

Por defecto, el frontend usa el servidor API del mismo equipo en `http://localhost:3000/api/v1`. La configuración no depende de la carpeta donde esté guardado el proyecto.

1. Inicia MySQL y la API Karen Flix en el puerto `3000`.
2. Sirve esta carpeta desde `http://localhost:5173` (por ejemplo, con Live Server configurado en ese puerto).
3. Configura `CORS_ORIGINS` en la API para incluir el origen exacto del frontend, por ejemplo `http://localhost:5173`, y reinicia el backend.
4. Abre el frontend desde el servidor local, no directamente como archivo `file://`.

Si la API está en otro equipo o puerto, cambia el contenido de `<meta name="api-base">` en `index.html` por la URL completa de la API, por ejemplo:

```html
<meta name="api-base" content="http://192.168.1.25:3000/api/v1">
```

En ese caso, el equipo que ejecuta la API debe permitir conexiones de red y `CORS_ORIGINS` debe incluir el origen desde el que se sirve el frontend. `localhost` siempre se refiere al equipo donde se abre el navegador.

## Datos que muestra

El catálogo, imágenes, categorías, directores, actores, puntuaciones y reseñas se leen de la API. Si el catálogo aparece vacío, verifica que `GET /api/v1/peliculas`, `/categorias`, `/directores` y `/actores` devuelvan registros. En una base nueva, ejecuta `src/database/schema.sql` y después `src/database/data.sql` del backend una sola vez para crear y cargar los datos de ejemplo.

Si un póster guardado en la base no carga, la tarjeta usa como respaldo la imagen de su categoría. Los URLs de póster del conjunto de ejemplo pueden devolver 404; reemplázalos por URLs válidas en la columna `peliculas.imagen` para mostrar el póster específico.

El ranking de películas y series se calcula como **promedio de puntuaciones + likes de reseñas − dislikes de reseñas** y se ordena de mayor a menor. Los usuarios autenticados pueden votar reseñas de otras personas, pero no la propia; tanto la interfaz como la API aplican esa regla.

La sección **Ranking** muestra hasta las 10 películas o series con reseñas, ordenadas por ese puntaje e indicando su posición. Si ninguna tiene reseñas, muestra “No hay ranking”.

El registro ofrece los tipos de cuenta **Usuario** y **Administrador**. Elegir Administrador exige el código `003` para enviar una solicitud, pero la cuenta conserva el rol de usuario hasta que un administrador la apruebe en el panel. Al iniciar sesión, las cuentas administradoras también deben ingresar ese código; a cuentas normales no se les concede permiso especial por conocerlo. Configura `ADMIN_REQUEST_CODE=003` en el `.env` del backend. Para instalaciones existentes, aplica primero `src/database/migration_solicitud_admin.sql` del backend y reinicia la API.

La aplicación permite iniciar sesión, registrarse, proponer películas o series, publicar reseñas y votar reseñas. En **Proponer**, los usuarios pueden enviar películas o series; la API las deja pendientes de aprobación. Al iniciar sesión como administrador, el desplegable también permite crear categorías, directores y actores; en las secciones de categorías y reparto, el administrador puede actualizarlos o eliminarlos. Estas acciones usan rutas CRUD protegidas del API. En el detalle, el creador de una obra o un administrador puede actualizarla o eliminarla; la API verifica el permiso y el frontend solo muestra esas acciones a quienes tienen autorización.
