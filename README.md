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
| David Huang | Shared `base.css` (site-wide styling), homepage (`index.html`), and Reviews API routes merged into the shared `server.js` |

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
│ ├── new-review.html
│ ├── review-list.html
│ ├── review-detail.html
│ ├── reviews.js
│ ├── review-list.js
│ ├── review-detail.js
│ └── reviews.css
```

## How to Run and Test the Application (A2 Prototype)

1. Open a terminal in the project root folder.
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. You should see: `TextSwap running at http://localhost:3000`
5. Open a browser to `http://localhost:3000` (do **not** use Live Server / port 5500 —
   the dynamic pages call `/api/...` routes that only exist on this Node server).

### Testing the Reviews & Ratings module
- Go to `http://localhost:3000/reviews/review-list.html` to browse, search, sort and
  filter existing reviews.
- Click **Write a Review** to submit a new one (try leaving fields blank or typing
  past 500 characters to see live validation and error prevention in action).
- Refresh the write-a-review page mid-typing to see the Web Storage draft autosave restore your input.
- Click **Read More** on any review to view its detail page. Reviews seeded with
  `userId: 101` (the default demo "logged-in user") will show a **Delete** button;
  others will not, demonstrating user-based dynamic behaviour.

## Reviews & Ratings — API Routes

| Feature | Description | Method | URL / Endpoint | Module |
|---|---|---|---|---|
| View reviews | Retrieves all reviews for the list page | GET | /api/reviews | Reviews |
| View review | Retrieves a single review by id for the detail page | GET | /api/reviews/:id | Reviews |
| Create review | Validates and adds a new review for the current user | POST | /api/reviews | Reviews |
| Update review | Edits a review, restricted to its owner | PUT | /api/reviews/:id | Reviews |
| Delete review | Removes a review, restricted to its owner | DELETE | /api/reviews/:id | Reviews |

## Notes
- Module assignments for A and C are still being confirmed in group chat; this README will be updated once finalized.
- The shared User Account module is still in progress. Until it's finished, the
  Reviews module uses a **placeholder logged-in user** (`userId: 101`, set in
  `reviews/reviews.js`, `reviews/review-detail.js`, and `getCurrentReviewUser()`
  in `server.js`). Once the real login/session system is ready, these should be
  swapped for the actual logged-in user's id.
- Data for all modules is in-memory only for this A2 prototype (no MongoDB yet),
  per the assignment spec.