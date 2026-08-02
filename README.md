# MiniSocial — Mini Social Media App

A small social media app built with:
- **Frontend:** plain HTML, CSS, and vanilla JavaScript (no frameworks)
- **Backend:** Django + Django REST Framework
- **Database:** SQLite
- **Auth:** Token authentication (the frontend stores a token in `localStorage`)

The coding style follows the SuperSimpleDev Amazon project pattern:
template literals to build HTML, `forEach()`/`map()` over arrays,
`querySelector()` + `addEventListener()`, ES modules, and `fetch()`
for all API calls.

## Folder Structure

```
project/
├── frontend/              Plain HTML/CSS/JS — open this in a browser
│   ├── index.html         Home feed
│   ├── profile.html       User profile page
│   ├── login.html         Log in page
│   ├── register.html      Sign up page
│   ├── styles/
│   │   ├── shared/        reset, variables, header, shared components
│   │   └── pages/         one CSS file per page
│   ├── scripts/
│   │   ├── home.js
│   │   ├── profile.js
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── utils/         fetch wrapper, formatting, header, post rendering
│   │   └── data/          api.js — every backend call lives here
│   └── images/
│
└── backend/                Django project — run this with Python
    ├── manage.py
    ├── requirements.txt
    ├── mysite/             Django project settings/urls
    └── social/              Django app: models, views, serializers, urls
```

## 1. Backend Setup (Django)

Requires Python 3.10+.

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create the SQLite database tables
python manage.py makemigrations social
python manage.py migrate

# (Optional) create an admin account to browse data at /admin/
python manage.py createsuperuser

# (Optional) seed some demo users, posts, follows, likes, and comments
python manage.py seed_demo_data

# Start the API server
python manage.py runserver
```

If you run `seed_demo_data`, you can log in immediately with any of:
`alice`, `bob`, or `carla` — password `demopass123` for all three.

The API will now be running at **http://127.0.0.1:8000/api/**.

## 2. Frontend Setup (plain HTML/CSS/JS)

The frontend is static — it makes `fetch()` calls to `http://127.0.0.1:8000/api`
(this is set in `frontend/scripts/utils/fetchUtils.js` as `API_BASE_URL`).

Because the pages use ES module `<script type="module">` tags, opening
`index.html` directly with `file://` will be blocked by the browser's CORS
rules for modules. Serve the frontend folder instead:

```bash
cd frontend

# Option A: Python's built-in server
python -m http.server 5500

# Option B: the VS Code "Live Server" extension
# Right-click index.html -> "Open with Live Server"
```

Then visit **http://127.0.0.1:5500/register.html** to create your first
account, or **http://127.0.0.1:5500/login.html** if you already have one.

Keep the Django server (step 1) running at the same time — the frontend
needs it for every action.

## 3. Using the App

1. **Register** a new account on `register.html`.
2. You'll be logged in automatically and redirected to the home feed.
3. **Create a post** — type a caption and/or attach a photo.
4. **Like**, **comment**, and **delete** (your own posts) directly from the feed.
5. Use the **search box** in the header to find other users.
6. Visit a user's **profile** to **follow/unfollow** them and see their posts.
7. On your own profile, click **Edit Profile** to change your bio and avatar.
8. Click **Log Out** in the header at any time.

## API Overview

| Method | Endpoint                          | Description                        |
|--------|------------------------------------|-------------------------------------|
| POST   | `/api/auth/register/`             | Create an account                  |
| POST   | `/api/auth/login/`                | Log in, get a token                |
| POST   | `/api/auth/logout/`               | Log out (deletes the token)        |
| GET/PUT| `/api/users/me/`                  | View/edit your own profile         |
| GET    | `/api/users/<username>/`          | View another user's profile        |
| GET    | `/api/users/search/?q=`           | Search users by username           |
| POST   | `/api/users/<username>/follow/`   | Follow / unfollow a user           |
| GET/POST| `/api/posts/`                    | List all posts / create a post     |
| GET    | `/api/posts/?username=<name>`     | List one user's posts              |
| DELETE | `/api/posts/<id>/`                | Delete your own post               |
| POST   | `/api/posts/<id>/like/`           | Like / unlike a post               |
| GET/POST| `/api/posts/<id>/comments/`      | List / add comments on a post      |

All endpoints except register and login require the header:
`Authorization: Token <your-token>`

## Notes

- `DEBUG = True` and a hard-coded `SECRET_KEY` are used for local
  development simplicity — change both before deploying anywhere public.
- `CORS_ALLOW_ALL_ORIGINS = True` is set so the static frontend can reach
  the API from any local port. Restrict this in production.
- Uploaded images (avatars and post photos) are saved under `backend/media/`.
