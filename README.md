# larabia-magazine

**La Rabia** — revista comunitaria digital del distrito 02 de Bilbao (Uribarri).

Split out of [uribarri.online](https://github.com/Gandino1984/uribarri.online) so the magazine can evolve as its own product with its own backend, database, and identity layer.

## Stack

- **Backend:** Node.js 22 · Express 4 · Sequelize 6 · MySQL 8
- **Frontend:** React 18 · Vite 6 · i18next (lives in [front-end/](front-end/))
- **Image processing:** Sharp · validate-image-type
- **Auth:** local (bcrypt) + Google OAuth
- **Email:** Nodemailer

## Layout

```
back-end/
  config/         Sequelize + environment loaders
  models/         Sequelize models (users, articles, blocks, projects, authors)
  controllers/    Business logic, grouped by domain
  routers/        Express route definitions
  middleware/     Upload + validation middleware
  services/       Email service
  utils/          Image conversion, validation, file cleanup
  uploads/        Runtime upload directory (gitignored)
  migrations/     SQL migration files
front-end/        React/Vite app (added in phase 5)
```

## Running locally

(Filled in once docker-compose is wired up — phase 6.)

## Status

Scaffolding in progress. See commit history for phase-by-phase progress.
