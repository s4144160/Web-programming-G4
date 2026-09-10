# Administration Account Changes

## Files modified

- `admin/dashboard.html`
- `admin/user-management.html`
- `admin/admin-users.js`
- `admin/admin.css`
- `admin/admin-dashboard.js` (new)
- `server.js`
- `assets/auth-nav.js`
- `account/account.js`
- `README.md`

`middleware/auth.js`, the Mongoose models and Shopping Cart frontend were audited but did not need changes.

## Features completed

- Added a protected Administration dashboard with total, active and locked account counts.
- Kept the existing User Management summary cards and MongoDB user table.
- Verified display of name, username, email, role, account status and date joined.
- Verified client-side search by username or email.
- Verified client-side filters for active, locked and deactivated accounts and user/admin roles.
- Added clear loading, success, error and access-denied messages.
- Removed the normal browser confirmation alert from lock/unlock actions.
- Prevented protected Admin content from displaying until administrator access succeeds.
- Redirected guests to login and showed an access-denied state to standard users.
- Added responsive Admin navigation and an internally scrolling mobile user table.
- Kept `auth.requireLogin` and `auth.requireAdmin` as the only authentication middleware.
- Restricted Admin user responses to an explicit safe set of fields.
- Added optional `MONGODB_DATABASE` configuration for isolated testing.

## Endpoints used

- `GET /api/admin/users` retrieves registered accounts for an administrator.
- `PUT /api/admin/users/:id/status` accepts only `active` or `locked`.
- `GET /api/account/me` supplies the current account to the shared navigation.
- `POST /api/account/login` and `POST /api/account/logout` manage the Admin session.

## Database collections verified

- `users` stores registered accounts, bcrypt password hashes, roles and status.
- `products` stores textbook listings using unique `productId` values.
- `carts` stores one user-owned cart document per account.
- `orders` stores completed user-owned orders without simulated payment details.

## Tests performed and passed

Testing used the temporary database `textswap_admin_accounts_test_20260909`.

- Guest Admin API request returned HTTP 401.
- Standard user Admin API request returned HTTP 403.
- Administrator loaded the user list and safe account fields.
- Password hashes, session data, reset data and credentials were absent from Admin responses.
- Username/email search and status/role filters returned the expected rows.
- Administrator locked and unlocked a standard account through both API and UI.
- Invalid status and invalid MongoDB ID returned HTTP 400.
- Missing user returned HTTP 404.
- Deactivated account status could not be changed.
- Administrator could not lock their own current account.
- Locked user could not log in.
- An already logged-in locked user received HTTP 403 for profile, password, cart, checkout, private order, review and Admin operations.
- Unlocked user logged in again.
- Four MongoDB products loaded with four unique frontend `id` values.
- Two accounts had separate MongoDB carts.
- One account could not retrieve another account's order.
- Cart and Order owner ids referred to real MongoDB users.
- Card number, expiry, CVV and payment objects were absent from saved orders.
- Products, cart and completed order survived a server restart.
- Product seeding did not create duplicates or overwrite an edited test record after restart.
- Admin dashboard and User Management worked at desktop and 390px mobile widths.
- Mobile user table scrolled inside its wrapper without causing page overflow.
- Admin pages produced no JavaScript exceptions, console errors or failed HTTP responses while used by an administrator.
- `npm install` reported zero dependency vulnerabilities.

The temporary test users, carts, orders and products were kept separate from the normal `textswap` database and removed after testing.

## Tests not performed

- No production MongoDB data was changed.
- No external payment provider was tested because checkout payment is deliberately simulated.
- Session invalidation across multiple Node server instances was not tested because the course prototype uses the in-memory Express session store.

## Remaining limitations

- Existing sessions are held in memory and disappear when Node restarts.
- Locking does not remove the session object from the in-memory store, but every later protected request reloads the user from MongoDB and rejects the locked account.
- The initial administrator still needs private `ADMIN_...` environment variables.
