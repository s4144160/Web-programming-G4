# TextSwap Discussion Forum module

This branch adds the MongoDB-backed Discussion Forum without changing the other TextSwap modules. Anyone can read discussions. Creating, replying, editing and deleting require an active logged-in account from the existing account module.

## Files

- `forum/forum-list.html` and `forum/forum-list.js` show searchable and sortable discussions.
- `forum/new-thread.html` and `forum/new-thread.js` create a discussion after checking the current login.
- `forum/thread-detail.html` and `forum/thread-detail.js` show the root post and nested replies, with owner controls.
- `forum/forum.css` contains the Forum layout and mobile rules while keeping `assets/base.css` unchanged.
- `models/ForumThread.js` stores a root discussion and its embedded replies.
- `routes/forum.js` contains the Forum API and server-side validation.
- `server.js` only imports and mounts the new router at `/api/forum`.

## MongoDB data

The `forumthreads` collection uses one document per discussion. The root document stores:

- `title`, `content` and required `imageUrl`
- `authorId` and the display snapshot `authorName`
- `createdAt`, `updatedAt` and `lastActivityAt`
- `isDeleted` and `deletedAt`
- an embedded `replies` array

Each reply stores the same post fields plus `parentReplyId`. A null parent means it replies to the root discussion. Otherwise it points to another reply in the same thread. The browser turns this flat reply array into a nested tree before displaying it.

Deletes are soft deletes. The database record remains with `isDeleted: true`, but deleted roots are excluded from public queries. Deleted replies are returned only as a small placeholder so their visible child replies keep the right nesting. Their author, title, content and image are not sent publicly.

## Forum API

| Method | Route | Login | Purpose |
| --- | --- | --- | --- |
| GET | `/api/forum/threads` | No | List non-deleted discussions. Supports `search`, `field=all|title|content`, and `sort=recent|oldest`. |
| GET | `/api/forum/threads/:threadId` | No | Get one discussion and its reply tree data. |
| POST | `/api/forum/threads` | Yes | Create a root discussion. |
| PUT | `/api/forum/threads/:threadId` | Owner | Edit the root discussion. |
| DELETE | `/api/forum/threads/:threadId` | Owner | Soft-delete the root discussion. |
| POST | `/api/forum/threads/:threadId/replies` | Yes | Add a root reply or a nested reply using `parentReplyId`. |
| PUT | `/api/forum/threads/:threadId/replies/:replyId` | Owner | Edit a reply. |
| DELETE | `/api/forum/threads/:threadId/replies/:replyId` | Owner | Soft-delete a reply without removing its children. |
| GET | `/api/forum/sitemap` | No | Return links for visible Forum threads and replies. |

POST and PUT requests validate title length, content length and the image URL/path again on the server. The server also validates MongoDB IDs and nested parent IDs. It gets the author from `req.user`, so the browser cannot choose another user as the author. The existing `requireLogin` middleware also rejects locked and deactivated accounts.

## Account and page integration

The pages load `assets/auth-nav.js`, so the shared header changes between Login/Sign Up and Profile/Logout using `GET /api/account/me`. The Forum uses the same endpoint to decide whether to show the reply form and owner actions. Public reads do not need a session.

All post content is inserted with DOM `textContent`. User-entered HTML is displayed as ordinary text rather than executed. The image field accepts an `http://` or `https://` URL, or a local path beginning `/assets/images/` with no `..` path segment.

## Run locally

1. Keep a local `.env` with the same MongoDB settings used by the integrated project. Do not commit it.
2. Run `npm install` if dependencies are not installed.
3. Run `npm start`.
4. Open `http://localhost:3000/forum/forum-list.html`.

## Manual test checklist

1. Log out and open the Forum list and a thread. Both should be readable.
2. Open New Discussion while logged out. The page should ask for login and not show an active create form.
3. Register or log in, then create a thread with a title, content and valid image URL/path.
4. Open the thread and add a reply. Reply again to that reply and confirm the second reply is indented below it.
5. Refresh the page and restart Node. Confirm the thread and replies still exist.
6. Edit your thread and one of your replies. The edited label and new text should remain after refresh.
7. Log in as a different normal user. Confirm that user's posts have Edit/Delete controls, but the first user's posts do not.
8. Try the same other-user PUT/DELETE calls directly. They should return 403.
9. Search by title, search by content, and try both recent and oldest sorting.
10. Delete a reply that has a child. The deleted placeholder should remain and the child should still display below it.
11. Delete a root discussion. It should disappear from the list, detail route and sitemap, while its MongoDB record remains soft-deleted.
12. Lock a test account from the existing Admin module. Its Forum write request should return 403 until the account is unlocked.
13. Try blank fields, a bad image path, an invalid ID and an unknown valid ID. Confirm useful 400 or 404 responses.
14. Check the list, create and detail pages at desktop, tablet and mobile widths.

## Merge into the integrated branch later

This branch is based on commit `40c5378` from `integration-all-modules`. It is not merged into `main`.

```powershell
git fetch origin
git switch integration-all-modules
git pull
git merge --no-ff origin/forum-module
```

Resolve a `server.js` conflict, if another module changed the same area, by keeping the other module code plus the Forum `require` and `app.use("/api/forum", forumRoutes)` lines. Use the integrated branch's local `.env`; do not add another `.env` to Git.
