# TextSwap Blog module

This branch adds the complete MongoDB-backed Blog to the existing TextSwap application. Visitors can read and search Blog posts and comments. Active logged-in users can publish posts, comment, edit their own posts and delete their own posts or comments.

## Files

- `models/BlogPost.js` defines the Blog post and embedded comment schemas.
- `routes/blog.js` contains the Blog JSON API, validation, authentication and ownership checks.
- `blog/blog-list.html` and `blog/blog-list.js` provide the dynamic searchable list view.
- `blog/new-post.html` and `blog/new-post.js` provide authenticated Blog creation.
- `blog/blog-detail.html` and `blog/blog-detail.js` provide the full post, comments, editing and deletion.
- `blog/blog.css` contains Blog-specific responsive styles using the existing `assets/base.css` variables.
- `server.js` only imports and mounts the Blog router.

No new packages, database connection or authentication system were added.

## MongoDB schema

Each `BlogPost` document contains:

- `title` (3–150 characters)
- `authorId` referencing the existing `User` collection
- `authorName`, copied from the user's current name or username when created
- `tags` (1–10 categories, each up to 30 characters)
- `content` (10–10000 characters)
- `imageUrl` (http(s) URL or safe `/assets/images/` project path)
- `comments`, stored as embedded comment subdocuments
- Mongoose `createdAt` and `updatedAt` timestamps
- `editedAt`, changed only when the post content is edited so adding a comment does not falsely mark the article as edited

Each comment contains its own `_id`, `authorId`, `authorName`, `content` and `createdAt`. Author IDs and timestamps always come from the server.

## API endpoints

| Method | Endpoint | Login | Purpose |
| --- | --- | --- | --- |
| GET | `/api/blog/posts` | No | List, search, filter and sort Blog post previews. |
| POST | `/api/blog/posts` | Yes | Publish a Blog post as the current user. |
| GET | `/api/blog/posts/:postId` | No | Retrieve the full post and comments. |
| PUT | `/api/blog/posts/:postId` | Owner | Edit title, tags, content and image. |
| DELETE | `/api/blog/posts/:postId` | Owner | Delete the post and its embedded comments. |
| POST | `/api/blog/posts/:postId/comments` | Yes | Add a comment as the current user. |
| DELETE | `/api/blog/posts/:postId/comments/:commentId` | Comment owner | Delete the current user's comment. |
| GET | `/api/blog/sitemap` | No | Return labels and URLs for public Blog posts. |

The Blog uses the existing `auth.requireLogin` middleware for every write route. This rejects logged-out, locked and deactivated accounts. Post and comment ownership compares the stored `authorId` with `req.user._id`, and an author ID from the browser is never trusted.

## Search and filtering

`GET /api/blog/posts` accepts:

- `search` with `field=all|title|author|content|tags|image`
- `tag` for an exact case-insensitive category filter
- `sort=newest|oldest`
- `from=YYYY-MM-DD` and `to=YYYY-MM-DD` using the original `createdAt`

Search text is escaped before a case-insensitive MongoDB regular expression is created. `field=all` searches title, author, content, tags and image path. The response includes preview data and available tags without requiring the browser to load full articles.

## Page workflow

1. `blog-list.js` retrieves previews from `/api/blog/posts` and creates cards with DOM methods.
2. `new-post.js` checks `/api/account/me`, validates the form and publishes through `POST /api/blog/posts`.
3. Successful creation redirects to `blog-detail.html?id=<postId>`.
4. `blog-detail.js` retrieves the full post and current user. It shows owner controls only when the IDs match.
5. Comments are loaded with the post, and logged-in users submit them to the comment endpoint.
6. All user text is assigned through `textContent`; text resembling HTML or script is displayed rather than executed.

Blog deletion is a hard delete because the assignment's audit/soft-delete requirement is specific to the Discussion Forum. The Blog sitemap endpoint is public, but the shared `sitemap.html` is intentionally unchanged for merge safety.

## Run and manual testing

1. Keep the integrated project's working local `.env`; do not commit it.
2. Run `npm install` if dependencies are not installed.
3. Run `npm start`.
4. Open `http://localhost:3000/blog/blog-list.html`.
5. While logged out, confirm the list/detail are public and New Post requests login.
6. Log in and create a post with title, comma-separated tags, content and a valid image URL/path.
7. Refresh and restart Node to confirm MongoDB persistence.
8. Add a comment, edit the post, and confirm the edited timestamp appears.
9. Log in as another user and confirm Edit/Delete are hidden for the first user's post.
10. Directly call the other-user PUT/DELETE endpoints and confirm HTTP 403.
11. Confirm each user can delete only their own comments.
12. Test every search field, tag filter, date range, and newest/oldest sort.
13. Lock a test account in Admin and confirm Blog writes return HTTP 403 until it is unlocked.
14. Test invalid IDs, missing fields, invalid image paths and oversized values.
15. Check the three Blog pages at desktop, tablet and 375px widths.

## Merge later

This branch starts from `integration-all-modules` commit `249c00e`. It is not merged into `main`.

```powershell
git fetch origin
git switch integration-all-modules
git pull origin integration-all-modules
git merge --no-ff origin/blog-module
```

If `server.js` conflicts because another module added a router, retain every existing module and add only the Blog `require` and `app.use("/api/blog", blogRoutes)` lines. Continue using the integration branch's local `.env`.
