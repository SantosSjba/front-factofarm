# FrontFactofarm

Cliente web de **FactoFarm** generado con [Angular CLI](https://github.com/angular/angular-cli) version 21.2.7.

## Arquitectura del proyecto

### Enfoque

- **Feature-based**: cada funcionalidad de negocio vive en `src/app/modules/<feature>/`.
- **Core**: servicios globales, guards e interceptors — se cargan una vez (típicamente desde `app.config` / raíz de la app).
- **Shared**: piezas reutilizables (componentes UI, pipes, directivas) sin lógica de un solo dominio.

### Estructura de carpetas (`src/app/`)

```text
src/app/
  core/
    services/       # p. ej. auth.service (singleton)
    guards/           # p. ej. authGuard / guestGuard
    interceptors/   # p. ej. adjuntar JWT (añadir al integrar API)
  shared/
    components/     # UI reutilizable (template TailAdmin)
    layout/
    pipe/             # pipes reutilizables (p. ej. safe-html)
    pipes/            # carpeta reservada / pipes adicionales
    directives/
    services/       # tema, sidebar, modal, etc.
  pages/            # solo páginas “globales” (p. ej. 404); el panel no vive aquí
  modules/
    admin/
      admin.routes.ts  # layout + rutas lazy del panel (dashboard, calendario, UI demo…)
      pages/           # vistas del back-office migradas del template
    auth/
      auth.routes.ts   # rutas lazy `/auth/signin`, `/auth/signup`
      pages/
```

`app.routes.ts` solo declara **cargas perezosas** (`loadChildren`) al módulo **admin** (ruta `''`), al módulo **auth** (`auth`), redirecciones y el **404**. Cada feature puede crecer con su propio `<feature>.routes.ts` e incluso sub-lazy routes. **Auth** compone formularios desde `shared/components/auth/`. Nuevos dominios (p. ej. `modules/ventas/`) siguen el mismo patrón.

Variables de entorno: `src/environments/environment.ts` (producción, `apiBaseUrl` típico `/api` detrás de proxy) y `environment.development.ts` (local: `http://localhost:3000/api`). El target de desarrollo reemplaza el archivo vía `fileReplacements` en `angular.json`.

### Estructura por feature (ejemplo `modules/properties/`)

```text
properties/
  pages/        # Rutas / vistas contenedoras
  components/   # Componentes específicos del feature
  services/     # Estado y llamadas HTTP del feature
  models/       # Tipos, interfaces, DTOs de vista
```

Evitar mezclar todo en carpetas globales `components/`, `services/` o `models/` a nivel de `app/`: no escala ni delimita límites del feature.

### Conexión con el backend

- La app consume la **API REST** del proyecto `api-factofarm` (NestJS).
- **Login**: `POST {apiBaseUrl}/auth/login` con `{ email, password }`; la respuesta incluye `accessToken` y `user`.
- **JWT**: el token se guarda en `sessionStorage`, el estado del usuario en `core` (`AuthService`) y se envía en cada petición al API con el **interceptor** `core/interceptors/auth.interceptor.ts` (`Authorization: Bearer …`). Arranca el backend y define `JWT_SECRET` en la API.

### Stack relacionado

- **Backend**: NestJS, Clean Architecture modular, Prisma, PostgreSQL.

## Requisitos

- **Node.js** LTS y **pnpm** (`packageManager` en `package.json`).
- Instalar dependencias: `pnpm install`.

## Development server

To start a local development server, run:

```bash
pnpm start
```

(or `pnpm exec ng serve`)

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
pnpm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
pnpm test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Despliegue en Coolify (producción)

> Idea general y checklist para otras apps: [`docs/COOLIFY-DOCKER-DEPLOY.md`](./docs/COOLIFY-DOCKER-DEPLOY.md).

El frontend **no se compila en el VPS**. Se construye la imagen Docker (Angular + nginx) en tu Mac, se publica como `latest` en Docker Hub y Coolify solo la descarga y ejecuta.

| Recurso | Valor |
|---------|--------|
| Imagen | `santossjba/front-factofarm:latest` |
| Coolify (proyecto) | FACTO FARM → production → `front-factofarm` |
| URL | https://factofarm.factosysperu.com |
| API que consume | https://api-factofarm.factosysperu.com/api/v1 |

Las variables `NG_APP_*` se **hornean en el build** (Angular no lee env en runtime). El `Dockerfile` escribe un `.env` de producción antes de `pnpm run build` vía `scripts/sync-env.mjs`.

### Requisitos en tu máquina

- Docker Desktop (build `linux/amd64` + login a Docker Hub como `santossjba`)
- Acceso a Coolify (`https://factosysperu.cloud`)

### Paso a paso tras un cambio de código

1. **Commit y push** (desde la raíz de `front-factofarm`):

```bash
git add -A
git status   # no subir .env ni secretos
git commit -m "mensaje claro del cambio"
git push origin main
```

2. **Build y push de la imagen** (solo tag `latest`):

```bash
docker buildx build --platform linux/amd64 \
  --build-arg NG_APP_API_BASE_URL=https://api-factofarm.factosysperu.com/api/v1 \
  --build-arg NG_APP_PRODUCTION=true \
  --build-arg NG_APP_SITE_URL=https://factofarm.factosysperu.com \
  -t santossjba/front-factofarm:latest \
  --push .
```

Si cambias dominio o URL de la API, ajusta esos `--build-arg` (y vuelve a build/push).

3. **Redeploy en Coolify**

- Abre **FACTO FARM → production → front-factofarm**
- Confirma imagen `santossjba/front-factofarm` y tag `latest`
- Puerto expuesto: `80`
- Dominio: `https://factofarm.factosysperu.com`
- Healthcheck: `GET /` en el puerto `80`
- **Deploy** / **Force rebuild**

4. **Verificar**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://factofarm.factosysperu.com/
```

Debe responder `200`. En el navegador, fuerza recarga (`Cmd+Shift+R`) para evitar cache de JS antiguos.

### Notas

- El `.dockerignore` excluye `.pnpm-store` y `node_modules` para no inflar el contexto de build.
- La imagen incluye `curl` porque Coolify lo usa en el healthcheck Alpine/nginx.
- CORS de la API debe incluir `https://factofarm.factosysperu.com` (ya configurado en Coolify del backend).
- No crear tags Docker adicionales: solo `latest`.

---

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
