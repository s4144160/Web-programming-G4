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
| Hai Nguyen Huu Nam | User Account System (register, login, profile, edit profile, password reset, session authentication) |

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

1. In the project root: `npm install`
2. Then: `npm start`
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

- Discussion list: `/forum/forum-list.html`
- Create a discussion: `/forum/new-thread.html`
- Discussion and replies: `/forum/thread-detail.html?id=THREAD_ID`

Forum discussions and replies are stored in MongoDB Atlas. Anyone can browse and search discussions, but users must log in to create a discussion or reply. A user can edit or delete only their own discussions and replies. Images are optional and can use a valid web URL or an image path from the project.

The forum supports searching by title or content, sorting by recent or oldest activity, nested replies, input validation, and dynamic discussion links for the sitemap.

## Blog module

- Blog list: `/blog/blog-list.html`
- Create a blog post: `/blog/new-post.html`
- Blog post and comments: `/blog/blog-detail.html?id=POST_ID`

Blog posts and comments are stored in MongoDB Atlas. Anyone can browse, search, filter, and read posts. A logged-in user can publish a post, comment on a post, and edit or delete only content that belongs to their account.

The blog supports title, author, content, tag, image and date searching, newest or oldest sorting, post tags, image URLs, comments, and dynamic blog links for the sitemap.

## Reviews and Ratings module

- Review list: `/reviews/review-list.html`
- Write a review: `/reviews/new-review.html`
- Review details: `/reviews/review-detail.html?id=REVIEW_ID`

Reviews are stored in MongoDB Atlas. Anyone can read reviews. A logged-in user can create a review and can edit or delete only reviews created by their own account. Review data is checked on the server, including the textbook title, rating, reviewer name, and review content.

Search, rating filters, and sorting are performed in client-side JavaScript after the review data is retrieved from the server.

## Wishlist module

- Wishlist: `/wishlist/wishlist.html`
- Add to Wishlist buttons: `/cart/products.html`

Wishlist records are stored in MongoDB Atlas and are connected to the logged-in user through their MongoDB user id. Users must log in to view or change a wishlist, so different accounts do not share saved products.

A user can save a product, remove it, move it to the Shopping Cart, or mark it as purchased. The wishlist also shows product activity information calculated from wishlist, cart, and completed order records.

## Administration module

- Administration dashboard: `/admin/dashboard.html`
- User administration: `/admin/user-management.html`

Both administration pages require a logged-in account with the `admin` role. The dashboard displays totals for registered, active, and locked users. User Management supports client-side searching and filtering and allows an administrator to lock or unlock other accounts.

The administrator routes check the session and role on the server. Password hashes are never returned to or displayed by the administration pages.

## Sitemap

- Sitemap entry point: `/sitemap.html`

The sitemap file is currently present but empty. The Forum and Blog APIs already provide dynamic sitemap data, but the sitemap page still needs to be completed before it can display the website pages and dynamic content links.
