# Project Management Tool

A full-stack project/task management tool.

- **Backend:** Django + Django REST Framework + PostgreSQL, JWT authentication (`djangorestframework-simplejwt`)
- **Frontend:** Vanilla HTML5 / CSS3 / JavaScript (no frameworks), talks to the API with `fetch()`

## Folder structure

```
project-management/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/            # Django project settings, urls, wsgi/asgi
│   └── projects/          # models, serializers, views, urls, migrations
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── project.html
│   ├── profile.html
│   ├── styles/
│   │   ├── shared/        # base.css (tokens/reset), components.css
│   │   └── pages/         # small per-page overrides
│   ├── scripts/
│   │   ├── api.js         # every fetch() call lives here
│   │   ├── login.js / register.js / dashboard.js / project.js / profile.js
│   └── images/
│
└── README.md
```

## 1. Create the PostgreSQL database

```bash
# using psql
createdb project_management
# or inside psql:
# CREATE DATABASE project_management;
```

## 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# then edit .env and fill in:
#   DB_NAME=project_management
#   DB_USER=<your postgres user>
#   DB_PASSWORD=<your postgres password>
#   DB_HOST=localhost
#   DB_PORT=5432
#   SECRET_KEY=<any long random string>
#   DEBUG=True

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser   # optional, for /admin/

python manage.py runserver
```

The API is now running at `http://127.0.0.1:8000/api/`.

## 3. Frontend setup

The frontend is static HTML/CSS/JS, so any local file server works. From the `frontend/` folder:

```bash
cd frontend
python -m http.server 5500
```

Then open `http://127.0.0.1:5500/login.html` in your browser (or use VS Code's "Live Server" extension instead). The frontend is already pointed at `http://127.0.0.1:8000/api` in `scripts/api.js` — change `API_BASE_URL` there if your backend runs somewhere else.

> Opening the HTML files directly with `file://` will NOT work for the API calls — serve them over `http://` as shown above.

## API overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register/` | POST | Create an account (returns tokens) |
| `/api/auth/login/` | POST | Log in (returns access/refresh tokens) |
| `/api/auth/token/refresh/` | POST | Exchange a refresh token for a new access token |
| `/api/auth/profile/` | GET/PATCH | View or update your own profile |
| `/api/projects/` | GET/POST | List your projects / create one |
| `/api/projects/<id>/` | GET/PATCH/DELETE | View a project / owner-only edit or delete |
| `/api/projects/<id>/members/` | GET/POST | List members / owner-only add by username |
| `/api/projects/<id>/members/<user_id>/` | DELETE | Owner-only remove a member |
| `/api/projects/<id>/tasks/` | GET/POST | List a project's tasks / create a task |
| `/api/tasks/<id>/` | GET/PATCH/DELETE | View/update a task, delete (creator or owner only) |
| `/api/tasks/<id>/comments/` | GET/POST | List/add comments on a task |
| `/api/comments/<id>/` | GET/PATCH/DELETE | Edit/delete your own comment |

All endpoints except register/login require `Authorization: Bearer <access_token>`.

## Test checklist

- [ ] PostgreSQL connection — `python manage.py migrate` connects without errors
- [ ] Migrations — `makemigrations` reports "No changes detected", `migrate` creates all tables
- [ ] Registration — creating an account with a new username/email succeeds; duplicate username/email is rejected
- [ ] Login — correct credentials log in; wrong password shows an error
- [ ] Project creation — a new project appears on the dashboard and its creator is the owner + a member
- [ ] Task creation — a task can be added to a project board in any status/priority
- [ ] Task assignment — a task can only be assigned to a project member; the assignee dropdown reflects current members
- [ ] Status changes — editing a task's status moves it into the correct board column
- [ ] Comments — adding, editing, and deleting your own comment works; you cannot edit someone else's comment
- [ ] Permissions — a user who is not a project member gets a 403/404 when trying to view or modify that project's data via the API
- [ ] Responsive frontend — dashboard, board, and modals remain usable at mobile widths (~375px) and tablet/desktop widths
