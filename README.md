# Secondhand Textbook Exchange Platform
COSC3060 Web Programming Studio - Group Assignment (Web Programming G4)

## Team Members & Module Responsibilities

| Name | Individual Module | Additional Shared Task | Files/Folders Responsible |
|---|---|---|---|
| Hai Nguyen Huu Nam | Shopping Cart | Admin (2 pages) | /cart, /admin | Discussion Forum | User Account System | /forum, /account | Wishlist (leftover 5th module, lead)| /wishlist |
| David Huang | Reviews & Ratings | Sitemap | /reviews, /sitemap.html | Blog | Wishlist (leftover 5th module, lead) | /blog, /wishlist | Discussion Forum | /forum |

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
│ ├── Product.js
│ ├── Cart.js
│ ├── Order.js
│ └── Review.js
├── middleware/
│ └── auth.js
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

1. In the project root: `npm install` or `npm.cmd install`
2. Then: `npm start` or `npm.cmd start`
3. Open `http://localhost:3000` in the browser (not Live Server / port 5500 —
   the dynamic pages depend on the `/api/...` routes served by this Node server).
4. Each module's pages are under its own folder (e.g. `/cart`, `/reviews`, `/forum`).
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

## Test Credentials

For marking purposes, the following accounts can be used to log in and test the application:

**Test user account**
- Username: `David`
- Password: `20050122`

**Test user account**
- Username: `Dung`
- Password: `123456`

**Administrator account**
- Username: `admin`
- Email: `admin@textswap.com`
- Password: `Admin123456`

The server always selects the `textswap` database. The administrator is created only when all three `ADMIN_...` values exist and no user already has that username or email. Keep `.env` private and do not commit it.

## User Account module

- Register: `/account/register.html`
- Login: `/account/login.html`
- Profile: `/account/profile.html`
- Edit profile and password: `/account/edit-profile.html`
- Prototype password reset: `/account/reset-password.html`
- User administration: `/admin/user-management.html`

Authentication uses `express-session`. The session currently uses Express's in-memory session store, which is suitable for this course prototype but should be replaced before production deployment. User records persist in MongoDB Atlas and passwords are stored only as bcrypt hashes.

After login, the current MongoDB user id is available as `req.session.userId`.

## Shopping Cart module

- Products: `/cart/products.html`
- Cart: `/cart/cart.html`
- Checkout: `/cart/checkout.html`
- Confirmation: `/cart/confirmation.html`

Products, user carts, and completed orders are stored in the `textswap` MongoDB database. Products can be browsed without logging in. Adding an item, viewing or changing a cart, checking out, and retrieving an order require a logged-in account. Each Cart and Order document stores the owning user's MongoDB id, so two accounts do not share cart or confirmation data.

The existing client-side search, filter, sorting, quantity validation, checkout draft Web Storage, and page design remain in place. MongoDB is the source of truth for products, cart items, prices, totals, and completed orders.

## Discussion Forum module

- Discussion list: /forum/forum-list.html
- Create discussion: /forum/new-thread.html
- Discussion details and replies: /forum/thread-detail.html?id=THREAD_ID
Forum discussions and replies persist in MongoDB Atlas. Anyone can browse and search discussions. Users must log in to create discussions or replies.
Users can edit or delete only their own discussions and replies. Images are optional. The forum supports searching by title or content and sorting by recent or oldest activity.

## Blog module

- Blog list: /blog/blog-list.html
- Create blog post: /blog/new-post.html
- Blog post details and comments: /blog/blog-detail.html?id=POST_ID
Blog posts and comments persist in MongoDB Atlas. Anyone can browse, search, filter, and read posts. Users must log in to publish posts or comments.
Users can edit or delete only their own blog posts and delete only their own comments. The blog supports searching, tags, date filtering, images, and newest or oldest sorting.

## Reviews and Ratings module

- Review list: /reviews/review-list.html
- Write review: /reviews/new-review.html
- Review details: /reviews/review-detail.html?id=REVIEW_ID
Reviews persist in MongoDB Atlas. Anyone can browse and read reviews. Users must log in to create, edit, or delete a review.
Users can edit or delete only reviews created by their own account. Search, rating filters, and sorting are performed using client-side JavaScript.

## Wishlist module

- Wishlist: /wishlist/wishlist.html
- Products with Add to Wishlist buttons: /cart/products.html
Wishlist records persist in MongoDB Atlas and are connected to the logged-in user’s MongoDB id. Users must log in to view or modify their wishlist, so different accounts do not share saved products.
Users can save products, remove products, move products to the Shopping Cart, and mark products as purchased.

## Administration module

- Administration dashboard: /admin/dashboard.html
- User management: /admin/user-management.html
Administration pages require a logged-in account with the admin role. The dashboard displays the total number of registered, active, and locked users.
User Management supports searching and filtering user accounts. Administrators can lock or unlock other accounts. Admin access is checked on the server, and user password hashes are never returned to the administration pages.
