# Secondhand Textbook Exchange Platform
COSC3060 Web Programming Studio - Group Assignment (Web Programming G4)

## Team Members & Module Responsibilities

| Name | Individual Module | Additional Shared Task | Files/Folders Responsible |
|---|---|---|---|
| [TBC] | Discussion Forum | User Account System (4 pages) | /forum, /account |
| Hai Nguyen Huu Nam | Shopping Cart | Admin (2 pages) | /cart, /admin |
| [TBC] | Blog | Wishlist (leftover 5th module, lead) | /blog, /wishlist |
| David Huang | Reviews & Ratings | Sitemap | /reviews, /sitemap.html |

## Additional Contributions

| Name | Contribution |
|---|---|
| David Huang | Shared `base.css` (site-wide styling) and homepage (`index.html`) |

## Project Structure
```
project-repo/
├── README.md
├── index.html
├── sitemap.html
├── server.js
├── package.json
├── models/
│ ├── User.js
│ └── Review.js
├── middleware/
│ └── auth.js
├── assets/
│ ├── base.css
│ ├── auth-nav.js
│ └── images/
├── account/
├── admin/
├── forum/
├── cart/
├── blog/
├── reviews/
```

## Setup and run

1. Copy `.env.example` to `.env`.
2. Add the MongoDB Atlas connection string and account settings shown below.
3. In the project root run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000` in the browser (not Live Server / port 5500 —
   the dynamic pages depend on the `/api/...` routes served by this Node server).
6. Each module's pages are under its own folder (e.g. `/cart`, `/reviews`, `/forum`).
   See each folder for module-specific testing notes if needed.

## Environment variables

```text
MONGODB_URI=your MongoDB Atlas connection string
SESSION_SECRET=a long random value
ADMIN_USERNAME=the initial administrator username
ADMIN_EMAIL=the initial administrator email
ADMIN_PASSWORD=the initial administrator password
PORT=3000
```

The server always selects the `textswap` database. The administrator is created only when all three `ADMIN_...` values exist and no user already has that username or email. Keep `.env` private and do not commit it.

## User Account module

- Register: `/account/register.html`
- Login: `/account/login.html`
- Profile: `/account/profile.html`
- Edit profile and password: `/account/edit-profile.html`
- Prototype password reset: `/account/reset-password.html`
- User administration: `/admin/user-management.html`

Authentication uses `express-session`. The session currently uses Express's in-memory session store, which is suitable for this course prototype but should be replaced before production deployment. User records persist in MongoDB Atlas and passwords are stored only as bcrypt hashes.

After login, the current MongoDB user id is available to future protected routes as `req.session.userId`. Shopping Cart data is still using its current implementation and has not been changed to user-specific MongoDB storage in this branch.
