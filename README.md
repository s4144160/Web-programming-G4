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
├── assets/
│ ├── base.css
│ └── images/
├── account/
├── admin/
├── forum/
├── cart/
├── blog/
├── reviews/
```

## How to Run (A2 Prototype)

1. In the project root: `npm install`
2. Then: `npm start`
3. Open `http://localhost:3000` in the browser (not Live Server / port 5500 —
   the dynamic pages depend on the `/api/...` routes served by this Node server).
4. Each module's pages are under its own folder (e.g. `/cart`, `/reviews`, `/forum`).
   See each folder for module-specific testing notes if needed.

## Notes
- Module assignments for A and C are still being confirmed in group chat; this README will be updated once finalized.
- The shared User Account/login module is still in progress — until it's ready,
  individual modules that need "the currently logged-in user" are using a
  placeholder user id internally. Update this once the login system is merged in.
- Data for all modules is in-memory only for this A2 prototype (no MongoDB yet), per the assignment spec.