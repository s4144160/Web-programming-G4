# TextSwap Wishlist module

## Overview

The Wishlist is private, account-specific, and stored in MongoDB. It reuses the existing User, Product, Cart and Order models. The Product collection remains the source of truth for a book's title, author, image and price.

## Model

`models/Wishlist.js` stores one record for each user/product pair:

- `userId`: reference to the logged-in User
- `productId`: the stable public `Product.productId` string
- `status`: `saved`, `moved-to-cart`, `purchased`, or `removed`
- `addedAt`, `movedToCartAt`, `purchasedAt`, and `removedAt`
- Mongoose `createdAt` and `updatedAt` timestamps

The compound unique index on `{ userId, productId }` prevents duplicate records. Re-adding an old record changes it back to `saved` instead of creating another record.

## API routes

All routes require the existing `auth.requireLogin` middleware. The user ID always comes from `req.user`; it is never accepted from the browser.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/wishlist` | Return the logged-in user's active and history items joined with Product data and real statistics. |
| POST | `/api/wishlist` | Add or reactivate a product. Body: `{ "productId": "..." }`. |
| DELETE | `/api/wishlist/:productId` | Soft-remove an item by setting its status to `removed`. |
| POST | `/api/wishlist/:productId/move-to-cart` | Add one copy to the existing user's Cart and mark the Wishlist record `moved-to-cart`. |
| PUT | `/api/wishlist/:productId/purchased` | Mark the Wishlist record as `purchased`. |
| GET | `/api/wishlist/:productId/stats` | Return real Wishlist, current Cart and completed Order counts for a product. |

Invalid product IDs return 400, missing products/items return 404, duplicate saved items return 409, and locked/deactivated accounts are rejected by the existing middleware.

## Product and Cart integration

`cart/cart.js` adds a separate `data-wishlist-product-id` button to generated catalogue cards. `wishlist/product-wishlist.js` handles only those buttons, checks the current account, prevents repeated clicks, and calls the Wishlist API. Existing Add to Cart handlers and Cart endpoints are unchanged.

Move to Cart uses the existing `Cart` document for `req.user._id`. It adds quantity 1 or increments the existing product, with the existing maximum of 99. No second cart is created.

## Statistics

Statistics are calculated from MongoDB when requested:

- users currently saving the product (`Wishlist.status = saved`)
- users who have ever had a record for the product
- current carts containing the product
- total current quantity across those carts
- total quantity in completed Orders

These values are not sample or browser-supplied numbers.

## Frontend workflow

Logged-out visitors see a Login prompt. Logged-in users see Active Wishlist and Purchased / History sections. Cards show Product information, saved/status dates, real statistics, a catalogue reference, and appropriate actions. Search, status filtering, price sorting, title sorting and saved-date sorting run in browser JavaScript.

## Privacy and security

- Every route uses `auth.requireLogin` and derives the owner from the session.
- Wishlist data is never exposed through a public sitemap API.
- Product details are read from MongoDB, not trusted from request bodies.
- Frontend content is created with DOM elements and `textContent`.
- Existing account lock/deactivate checks apply automatically.

## Testing

Run `npm install`, provide the normal local `.env`, then run `npm start` and open `http://localhost:3000/cart/products.html`. Test two separate accounts, duplicate adds, removal/re-add, moving to Cart, marking purchased, stats, refresh persistence, and locked-account rejection.

## Merge instructions

This branch was created directly from `integration-all-modules`, separately from Blog. After review, merge it into the integration branch (not directly into main):

```bash
git switch integration-all-modules
git pull origin integration-all-modules
git merge --no-ff wishlist-module
git push origin integration-all-modules
```

Resolve any later `server.js` conflict by retaining every module's `require` and `app.use` line. Do not commit a real `.env` file.
