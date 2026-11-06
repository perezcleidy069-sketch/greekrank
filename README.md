# GeekRank

Frontend de GeekRank hecho con HTML, CSS y JavaScript nativo. Consume la API Karen Flix en `/api/v1`; no necesita frameworks ni librerías de frontend.

## Árbol de trabajo y estructura

El frontend y el backend son proyectos separados. El frontend contiene la interfaz; la API y la base de datos están en la carpeta `karen-flix`, que se ejecuta aparte.

```text
greekrank/
├── index.html             # Página principal y estructura de las vistas
├── css/
│   └── styles.css         # Estilos y diseño responsive
├── js/
│   ├── app.js             # Lógica principal: catálogo, reseñas y acciones
│   ├── api.js             # Conexión con la API y envío del token
│   └── ui.js              # Modales, pestañas y otras interacciones visuales
└── README.md              # Guía del proyecto, configuración y uso

karen-flix/                 API backend (proyecto separado)
├── server.js
├── src/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── dto/
│   ├── factory/
│   ├── middlewares/
│   ├── models/
│   ├── observer/
│   ├── routers/
│   ├── services/
│   ├── utils/
│   └── validator/
├── tests/
├── .env.example
└── package.json
```

`node_modules/` y el archivo `.env` del backend no se incluyen en el árbol: son dependencias generadas y configuración local, respectivamente.

### Qué hace cada parte

**Frontend (`greekrank/`):**

- `index.html`: estructura de la página, vistas, formularios y puntos de carga de los scripts y estilos.
- `css/styles.css`: diseño visual y adaptación a distintos tamaños de pantalla.
- `js/app.js`: comportamiento de la aplicación; carga y muestra películas, reseñas y ranking, y gestiona las acciones de usuario y administrador.
- `js/api.js`: comunicación HTTP con Karen Flix; agrega el token de sesión a las solicitudes autenticadas y presenta errores de la API.
- `js/ui.js`: acciones y utilidades de interfaz compartidas, como abrir el acceso, cambiar pestañas y mostrar notificaciones.
- `README.md`: instrucciones de instalación, configuración y uso.

**Backend (`karen-flix/`, separado del frontend):**

- `server.js`: carga variables locales y arranca el servidor.
- `src/app.js`: configura Express, CORS, límites de solicitudes, documentación y rutas de la API.
- `src/routers/`: define los endpoints para usuarios, películas, reseñas, categorías, actores y directores.
- `src/controllers/`, `src/services/` y `src/models/`: organizan el manejo de solicitudes, reglas de negocio y acceso a datos.
- `src/middlewares/`, `src/validator/` y `src/dto/`: autenticación, permisos, validación y forma de los datos.
- `src/config/`: conexión a MySQL, autenticación JWT y documentación OpenAPI.
- `src/database/`: esquema y datos iniciales SQL, además de migraciones para bases ya creadas.
- `src/factory/`, `src/observer/` y `src/utils/`: utilidades y lógica compartida, incluida la creación segura de usuarios y el cálculo de ranking.
- `tests/`: pruebas automatizadas del backend.
- `.env.example`: plantilla de configuración; se copia a `.env` y se completa localmente.
- `package.json`: dependencias y comandos npm del backend.

**Recorrido de una solicitud:** `index.html` carga `app.js`; cuando se necesitan datos, `app.js` llama a `api.js`. La solicitud llega a un endpoint definido en `src/routers/`, donde se valida la sesión y la entrada; después la lógica del backend consulta o modifica MySQL. La respuesta vuelve al frontend, que actualiza la pantalla. Las operaciones administrativas se protegen en la API además de ocultar sus controles en la interfaz.

## Conectar con la API

En GitHub Pages, el frontend usa la API pública publicada en Vercel: `https://karen-weld.vercel.app/api/v1`. Al ejecutar el frontend localmente, usa `http://localhost:3000/api/v1`.

Para desarrollo local:

1. Inicia MySQL y la API Karen Flix en el puerto `3000`.
2. Sirve esta carpeta desde `http://localhost:5173` (por ejemplo, con Live Server configurado en ese puerto).
3. Configura `CORS_ORIGINS` en la API para incluir el origen exacto del frontend, por ejemplo `http://localhost:5173`, y reinicia el backend.
4. Abre el frontend desde el servidor local, no directamente como archivo `file://`.

La URL puede sobrescribirse en `index.html` mediante `<meta name="api-base">`, por ejemplo:

```html
<meta name="api-base" content="https://tu-api.example.com/api/v1">
```

En producción, `CORS_ORIGINS` de la API debe incluir el origen del frontend, `https://perezcleidy069-sketch.github.io` (sin `/greekrank/`). `localhost` siempre se refiere al equipo donde se abre el navegador.

## Datos que muestra

El catálogo, imágenes, categorías, directores, actores, puntuaciones y reseñas se leen de la API. Si el catálogo aparece vacío, verifica que `GET /api/v1/peliculas`, `/categorias`, `/directores` y `/actores` devuelvan registros. En una base nueva, ejecuta `src/database/schema.sql` y después `src/database/data.sql` del backend una sola vez para crear y cargar los datos de ejemplo.

Si un póster guardado en la base no carga, la tarjeta usa como respaldo la imagen de su categoría. Los URLs de póster del conjunto de ejemplo pueden devolver 404; reemplázalos por URLs válidas en la columna `peliculas.imagen` para mostrar el póster específico.

El ranking de películas y series se calcula como **promedio de puntuaciones + likes de reseñas − dislikes de reseñas** y se ordena de mayor a menor. Los usuarios autenticados pueden votar reseñas de otras personas, pero no la propia; tanto la interfaz como la API aplican esa regla.

Los botones **Me gusta** y **No me gusta** de una película son independientes de los votos de sus reseñas. Cualquier usuario con sesión iniciada puede votar, incluso si escribió una reseña propia; cada cuenta tiene un solo voto por película y puede cambiarlo o quitarlo. La API guarda el ID del usuario y su voto en MySQL. Estos votos no cambian el puntaje del ranking.

La sección **Ranking** muestra hasta las 10 películas o series con reseñas, ordenadas por ese puntaje e indicando su posición. Si ninguna tiene reseñas, muestra “No hay ranking”.

## Cómo usar la aplicación

### Visitante

Sin iniciar sesión puedes explorar películas y series, consultar categorías y reparto, ver reseñas y el ranking. Para dar Me gusta a una película, publicar una reseña o votar una reseña ajena, primero inicia sesión.

### Usuario

1. Pulsa **Sesión** y luego **Registrarse**.
2. Deja seleccionado **Usuario**, completa nombre, correo y contraseña y crea la cuenta.
3. Inicia sesión con ese correo y contraseña. El campo de código de administrador se deja vacío.
4. Abre una película o serie para publicar una reseña y votar las reseñas de otras personas. No puedes votar tu propia reseña.
5. En **Proponer**, envía una película o serie. La propuesta queda pendiente de aprobación; si editas tu propuesta, vuelve a requerir aprobación. Puedes gestionar tus propias reseñas y propuestas, pero no las de otros usuarios.

Una cuenta normal no puede crear, actualizar ni eliminar categorías, actores o directores.

### Administrador

El código `003` no concede por sí solo permisos de administrador. Se requiere una cuenta con el rol aprobado en la base de datos y el código al iniciar sesión.

**Configuración inicial:** configura `ADMIN_REQUEST_CODE=003` en el `.env` del backend y reinicia la API. Si ya existe la base de datos, ejecuta una sola vez `src/database/migration_solicitud_admin.sql` del backend (omite este paso si la columna `solicitud_admin` ya existe). Como todavía no habrá un administrador que pueda aprobar solicitudes, crea al primer administrador manualmente en MySQL Workbench, asignando el rol a una cuenta registrada:

```sql
UPDATE greekrang.usuarios
SET `role` = 'administrador'
WHERE email = 'correo-del-primer-admin@ejemplo.com';
```

Después:

1. En **Sesión**, inicia sesión con el correo y contraseña de esa cuenta y escribe `003` en **Código de administrador**.
2. En **Proponer**, selecciona **Crear categoría**, **Crear director** o **Crear actor** para agregar elementos del catálogo.
3. En **Categorías** y **Reparto**, usa **Actualizar** o **Eliminar** junto al elemento que quieras gestionar.
4. En el panel de administración, revisa las películas y series pendientes y las solicitudes de acceso de administrador.

**Para las siguientes cuentas administradoras:** la persona se registra eligiendo **Administrador**, ingresa `003` y crea su cuenta. Esto solo envía una solicitud: conserva permisos de usuario hasta que un administrador existente la apruebe desde el panel. Una vez aprobada, cierra sesión e inicia sesión de nuevo con `003` para usar los permisos.

El código se configura en el backend; no lo cambies solo en el frontend. Si configuras un valor distinto de `003` en `ADMIN_REQUEST_CODE`, ese será el valor que debe usarse tanto al solicitar como al iniciar sesión como administrador.

## Resumen de permisos

| Acción | Visitante | Usuario | Administrador |
|---|---:|---:|---:|
| Explorar obras y ver reseñas/ranking | Sí | Sí | Sí |
| Publicar reseña o votar reseña ajena | No | Sí | Sí |
| Proponer película o serie | No | Sí, queda pendiente | Sí, se publica directamente |
| Actualizar o eliminar su propia reseña | No | Sí | Sí |
| Gestionar su propia propuesta | No | Sí | Sí |
| Crear, actualizar o eliminar categorías, actores y directores | No | No | Sí |
| Aprobar propuestas y solicitudes de administrador | No | No | Sí |
