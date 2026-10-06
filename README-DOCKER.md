# RUVENTU with Docker Compose

## Prerequisites

- Docker Desktop (or Docker Engine with Docker Compose)
- A Cloudinary account if image uploads must be enabled

## Configure

Copy the template and replace every `change-me`/Cloudinary placeholder:

```powershell
Copy-Item .env.example .env
```

`VITE_RUVENTU_ADMIN_USERNAME` and `VITE_RUVENTU_ADMIN_PASSWORD` must match the seeded admin account. Vite embeds these values during the frontend build, so rebuild after changing them.

## Start

```powershell
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

The first startup imports the catalog seed and then Spring JPA creates/updates the remaining schema. MySQL is available to the backend inside the Compose network at `mysql:3306`; it is intentionally not published to the host. Its data persists in the `mysql_data` named volume.

## Stop

```powershell
docker compose down
```

## Reset the database

This permanently removes the Compose database volume and re-imports the seed next time:

```powershell
docker compose down --volumes
docker compose up --build
```
