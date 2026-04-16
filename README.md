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
    services/
    guards/
    interceptors/
  shared/
    components/
    pipes/
    directives/
  modules/
    auth/
    dashboard/
    properties/
    clients/
    sales/
```

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
- **JWT**: tokens gestionados en `core` (servicio de auth) y adjuntos con un **interceptor** HTTP.

### Stack relacionado

- **Backend**: NestJS, Clean Architecture modular, Prisma, PostgreSQL.

## Development server

To start a local development server, run:

```bash
ng serve
```

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
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
