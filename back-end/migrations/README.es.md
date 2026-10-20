# Migraciones

[English](README.md) · **Español**

`001_init_schema.sql` crea todo el esquema de larabia-magazine de una sola vez en una base de datos vacía. Es la consolidación de las migraciones de la revista 027–049 de uribarri.online.

Los archivos numerados siguientes (`002_…`, `003_…`, `004_…`) son cambios **incrementales** sobre `001`.

## Cómo aplicarlas

**Docker, solo base de datos nueva:**

- El contenedor de MySQL ejecuta los archivos de `db/scripts/` mediante `docker-entrypoint-initdb.d`, pero **solo en el primer arranque, con el volumen de datos vacío**.
- Una vez existe el volumen, MySQL no vuelve a ejecutarlos: añadir un `00x_*.sql` nuevo **no** lo aplica a una base ya en marcha.
- En una base existente, las migraciones nuevas se aplican a mano (ver abajo).

**A mano / en local (base nueva):**
```bash
mysql -u root -p larabia_db < back-end/migrations/001_init_schema.sql
```

### Aplicar una migración incremental a una base existente

Ejecuta cada migración nueva **una sola vez**, en orden.

- **No son idempotentes:** un `ALTER TABLE … ADD COLUMN/INDEX` falla con «Duplicate column/key» si se ejecuta dos veces, así que compruébalo antes.
- El archivo `.sql` puede no estar en el servidor de despliegue: puedes pasarlo por la entrada estándar o pegar las sentencias directamente.

```bash
# desde una copia que tenga el archivo:
docker exec -i larabia_db mysql -u root -p"$ROOT_PW" larabia_db \
  < back-end/migrations/004_add_is_admin_role.sql

# o directamente, si el archivo no está en esta máquina:
docker exec -i larabia_db mysql -u root -p"$ROOT_PW" larabia_db <<'SQL'
ALTER TABLE user ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_editor;
ALTER TABLE user ADD INDEX idx_is_admin (is_admin);
SQL
```

Comprueba antes si una migración ya está aplicada, por ejemplo:
```bash
docker exec -i larabia_db mysql -u root -p"$ROOT_PW" \
  -e "SHOW COLUMNS FROM user LIKE 'is_admin';" larabia_db
```
Si sale una fila, ya está aplicada: **no** la repitas.

## Columnas que se añaden al arrancar

Desde la `012`, el back-end comprueba al arrancar (`back-end/index.js`) las columnas que añaden sus migraciones más nuevas y crea las que falten, así que un despliegue ya no depende de aplicarlas a mano:

| Migración | Añade |
|---|---|
| `012` | `magazine_workshops.audience_workshop` |
| `013` | `magazine_workshops.lat_workshop`, `lng_workshop` |
| `016` | `'paisaje'` en `article_blocks.block_type`; `article_blocks.soundscape_data` |
| `017` | `sections_article` / `sections_requested_article`, `sections_project` / `sections_requested_project` |
| `018` | `user.author_invite_status`, `author_invited_by`, `author_invited_at` |
| `019` | `translations_article`, `translations_block`, `translations_project` |
| `021` | `reader_subscriptions.complimentary`, `complimentary_at` |
| `022` | `magazine_workshops.free_workshop` |

Las tablas de `009`, `010`, `011`, `014`, `015` y `020` se crean al arrancar con `sync()` de Sequelize si no existen. Los archivos SQL siguen siendo la referencia para una base nueva.

## Tablas

| Tabla | Para qué |
|---|---|
| `user` | Cuentas: roles (`is_editor`, `is_admin`, `is_super_admin`, `is_premium_reader`), vínculo con Google, estado de la invitación de autoría |
| `magazine_projects` | Proyectos que agrupan publicaciones (tipo, formato, secciones, traducciones) |
| `magazine_articles` | Publicaciones: portada y datos; el contenido está en `article_blocks` |
| `article_blocks` | Bloques de contenido ordenados: `text` / `image` / `iframe` / `comic_panel` / `paisaje` (+ traducciones) |
| `article_authors` | N:M — las autoras/es de un artículo |
| `article_author_invitations` | Invitaciones de coautoría (pendiente / aceptada / rechazada) |
| `project_authors` | N:M — las autoras/es de un proyecto |
| `author_profiles` | El perfil público de autoría de un usuario (biografía, enlaces, borrador / publicado) |
| `magazine_metadata` | Fila única: nombre, eslogan, descripción, logos |
| `magazine_theme` | Fila única: tema, colores, fondo de portada, animaciones |
| `magazine_nav` | Fila única: el menú de la barra superior (`nav_config` JSON; NULL = el de por defecto) |
| `magazine_workshops` | Talleres (fecha, lugar, ubicación en el mapa, aforo, público) |
| `workshop_authors` | N:M — quién imparte un taller |
| `workshop_reservations` | Reservas |
| `workshop_blocks` | Personas bloqueadas en un taller |
| `workshop_invitations` | Invitaciones a talleres (mientras están pendientes reservan plaza) |
| `article_likes`, `article_favorites`, `article_comments` | La interacción de quienes leen |
| `project_subscriptions` | Lectoras/es que siguen un proyecto |
| `reader_subscriptions` | Suscripciones de pago (cliente y suscripción de Stripe) |
| `open_space_proposals` | Propuestas literarias enviadas desde Espacio abierto (texto o archivo privado en `uploads/proposals/`, estado) |

## Diferencias con uribarri.online

- La tabla `user` quita `type_user`, `phone_user`, `contributor_user`, `calification_user`, `is_manager` y todas las columnas `telegram_*`.
- La clave única `(email_user, type_user)` se sustituye por una clave única solo en `email_user`: una cuenta por email, porque la revista no tiene tipos de usuario.
- Sin datos iniciales: la revista empieza vacía, según el plan de la separación.
