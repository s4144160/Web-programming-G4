const express = require("express");
const mongoose = require("mongoose");
const ForumThread = require("../models/ForumThread");
const auth = require("../middleware/auth");

const router = express.Router();

function postValues(body) {
    return {
        title: typeof body.title === "string" ? body.title.trim() : "",
        content: typeof body.content === "string" ? body.content.trim() : "",
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() : ""
    };
}

function validImageUrl(value) {
    if (/^https?:\/\/[^\s]+$/i.test(value)) {
        return true;
    }

    if (value.indexOf("..") !== -1) {
        return false;
    }

    return /^\/assets\/images\/[a-z0-9_.%()\- /]+$/i.test(value);
}

function validatePost(body) {
    let values = postValues(body || {});
    let errors = [];

    if (values.title.length < 3 || values.title.length > 120) {
        errors.push("Title must be between 3 and 120 characters.");
    }
    if (values.content.length < 1 || values.content.length > 3000) {
        errors.push("Post content must be between 1 and 3000 characters.");
    }
    if (values.imageUrl && (values.imageUrl.length > 500 || !validImageUrl(values.imageUrl))) {
        errors.push("Use a valid http(s) image URL or /assets/images/ project path.");
    }

    return { values: values, errors: errors };
}

function authorName(user) {
    if (user.name && user.name.trim()) {
        return user.name.trim();
    }
    return user.username;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function publicReply(reply) {
    let result = {
        id: reply._id.toString(),
        parentReplyId: reply.parentReplyId ? reply.parentReplyId.toString() : null,
        isDeleted: reply.isDeleted === true,
        createdAt: reply.createdAt
    };

    if (reply.isDeleted) {
        return result;
    }

    result.title = reply.title;
    result.content = reply.content;
    result.imageUrl = reply.imageUrl;
    result.authorId = reply.authorId.toString();
    result.authorName = reply.authorName;
    result.updatedAt = reply.updatedAt;
    return result;
}

function publicThread(thread) {
    let replies = [];
    for (let i = 0; i < thread.replies.length; i++) {
        replies.push(publicReply(thread.replies[i]));
    }

    return {
        id: thread._id.toString(),
        title: thread.title,
        content: thread.content,
        imageUrl: thread.imageUrl,
        authorId: thread.authorId.toString(),
        authorName: thread.authorName,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        lastActivityAt: thread.lastActivityAt,
        replies: replies
    };
}

function updateLastActivity(thread) {
    let latest = new Date(thread.createdAt);

    for (let i = 0; i < thread.replies.length; i++) {
        let reply = thread.replies[i];
        if (!reply.isDeleted && new Date(reply.createdAt) > latest) {
            latest = new Date(reply.createdAt);
        }
    }

    thread.lastActivityAt = latest;
}

router.get("/threads", async function (req, res) {
    let search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    let field = typeof req.query.field === "string" ? req.query.field : "all";
    let sort = typeof req.query.sort === "string" ? req.query.sort : "recent";

    if (field !== "all" && field !== "title" && field !== "content") {
        return res.status(400).json({ message: "Search field must be all, title or content." });
    }
    if (sort !== "recent" && sort !== "oldest") {
        return res.status(400).json({ message: "Sort must be recent or oldest." });
    }
    if (search.length > 100) {
        return res.status(400).json({ message: "Search text must be 100 characters or less." });
    }

    let query = { isDeleted: { $ne: true } };
    if (search) {
        let regex = new RegExp(escapeRegex(search), "i");
        if (field === "title") {
            query.title = regex;
        } else if (field === "content") {
            query.$or = [
                { content: regex },
                { replies: { $elemMatch: { isDeleted: { $ne: true }, content: regex } } }
            ];
        } else {
            query.$or = [
                { title: regex },
                { content: regex },
                {
                    replies: {
                        $elemMatch: {
                            isDeleted: { $ne: true },
                            $or: [{ title: regex }, { content: regex }]
                        }
                    }
                }
            ];
        }
    }

    try {
        let sortQuery = sort === "oldest" ? { createdAt: 1 } : { lastActivityAt: -1, createdAt: -1 };
        let threads = await ForumThread.find(query).sort(sortQuery);
        let result = [];

        for (let i = 0; i < threads.length; i++) {
            let visibleReplies = 0;
            for (let j = 0; j < threads[i].replies.length; j++) {
                if (!threads[i].replies[j].isDeleted) {
                    visibleReplies++;
                }
            }

            let preview = threads[i].content;
            if (preview.length > 180) {
                preview = preview.slice(0, 180) + "...";
            }

            result.push({
                id: threads[i]._id.toString(),
                title: threads[i].title,
                contentPreview: preview,
                imageUrl: threads[i].imageUrl,
                authorName: threads[i].authorName,
                createdAt: threads[i].createdAt,
                lastActivityAt: threads[i].lastActivityAt,
                visibleReplyCount: visibleReplies
            });
        }

        res.json({ threads: result, count: result.length });
    } catch (err) {
        res.status(500).json({ message: "Forum threads could not be loaded." });
    }
});

router.get("/sitemap", async function (req, res) {
    try {
        let threads = await ForumThread.find({ isDeleted: { $ne: true } }).sort({ createdAt: 1 });
        let links = [];

        for (let i = 0; i < threads.length; i++) {
            let threadUrl = "/forum/thread-detail.html?id=" + threads[i]._id;
            links.push({
                type: "thread",
                title: threads[i].title,
                url: threadUrl
            });

            for (let j = 0; j < threads[i].replies.length; j++) {
                let reply = threads[i].replies[j];
                if (!reply.isDeleted) {
                    links.push({
                        type: "reply",
                        title: reply.title,
                        url: threadUrl + "#post-" + reply._id
                    });
                }
            }
        }

        res.json({ links: links });
    } catch (err) {
        res.status(500).json({ message: "Forum sitemap data could not be loaded." });
    }
});

router.post("/threads", auth.requireLogin, async function (req, res) {
    let checked = validatePost(req.body);
    if (checked.errors.length) {
        return res.status(400).json({ message: checked.errors.join(" ") });
    }

    try {
        let now = new Date();
        let thread = await ForumThread.create({
            title: checked.values.title,
            content: checked.values.content,
            imageUrl: checked.values.imageUrl,
            authorId: req.user._id,
            authorName: authorName(req.user),
            createdAt: now,
            updatedAt: now,
            lastActivityAt: now,
            isDeleted: false,
            replies: []
        });

        res.status(201).json({ message: "Discussion created.", thread: publicThread(thread) });
    } catch (err) {
        res.status(500).json({ message: "The discussion could not be created." });
    }
});

router.get("/threads/:threadId", async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.threadId)) {
        return res.status(400).json({ message: "Invalid discussion ID." });
    }

    try {
        let thread = await ForumThread.findById(req.params.threadId);
        if (!thread || thread.isDeleted) {
            return res.status(404).json({ message: "Discussion was not found." });
        }

        res.json({ thread: publicThread(thread) });
    } catch (err) {
        res.status(500).json({ message: "The discussion could not be loaded." });
    }
});

router.put("/threads/:threadId", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.threadId)) {
        return res.status(400).json({ message: "Invalid discussion ID." });
    }

    let checked = validatePost(req.body);
    if (checked.errors.length) {
        return res.status(400).json({ message: checked.errors.join(" ") });
    }

    try {
        let thread = await ForumThread.findById(req.params.threadId);
        if (!thread || thread.isDeleted) {
            return res.status(404).json({ message: "Discussion was not found." });
        }
        if (thread.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only edit your own discussion." });
        }

        thread.title = checked.values.title;
        thread.content = checked.values.content;
        thread.imageUrl = checked.values.imageUrl;
        thread.updatedAt = new Date();
        await thread.save();

        res.json({ message: "Discussion updated.", thread: publicThread(thread) });
    } catch (err) {
        res.status(500).json({ message: "The discussion could not be updated." });
    }
});

router.delete("/threads/:threadId", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.threadId)) {
        return res.status(400).json({ message: "Invalid discussion ID." });
    }

    try {
        let thread = await ForumThread.findById(req.params.threadId);
        if (!thread || thread.isDeleted) {
            return res.status(404).json({ message: "Discussion was not found." });
        }
        if (thread.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only delete your own discussion." });
        }

        thread.isDeleted = true;
        thread.deletedAt = new Date();
        await thread.save();
        res.json({ message: "Discussion deleted." });
    } catch (err) {
        res.status(500).json({ message: "The discussion could not be deleted." });
    }
});

router.post("/threads/:threadId/replies", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.threadId)) {
        return res.status(400).json({ message: "Invalid discussion ID." });
    }

    let checked = validatePost(req.body);
    if (checked.errors.length) {
        return res.status(400).json({ message: checked.errors.join(" ") });
    }

    let parentReplyId = req.body.parentReplyId || null;
    if (parentReplyId && !mongoose.Types.ObjectId.isValid(parentReplyId)) {
        return res.status(400).json({ message: "Invalid parent reply ID." });
    }

    try {
        let thread = await ForumThread.findById(req.params.threadId);
        if (!thread || thread.isDeleted) {
            return res.status(404).json({ message: "Discussion was not found." });
        }

        if (parentReplyId) {
            let parent = thread.replies.id(parentReplyId);
            if (!parent || parent.isDeleted) {
                return res.status(404).json({ message: "The parent reply is not available." });
            }
        }

        let now = new Date();
        thread.replies.push({
            title: checked.values.title,
            content: checked.values.content,
            imageUrl: checked.values.imageUrl,
            authorId: req.user._id,
            authorName: authorName(req.user),
            parentReplyId: parentReplyId,
            createdAt: now,
            updatedAt: now,
            isDeleted: false
        });
        thread.lastActivityAt = now;
        await thread.save();

        let reply = thread.replies[thread.replies.length - 1];
        res.status(201).json({ message: "Reply posted.", reply: publicReply(reply) });
    } catch (err) {
        res.status(500).json({ message: "The reply could not be posted." });
    }
});

router.put("/threads/:threadId/replies/:replyId", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.threadId) || !mongoose.Types.ObjectId.isValid(req.params.replyId)) {
        return res.status(400).json({ message: "Invalid discussion or reply ID." });
    }

    let checked = validatePost(req.body);
    if (checked.errors.length) {
        return res.status(400).json({ message: checked.errors.join(" ") });
    }

    try {
        let thread = await ForumThread.findById(req.params.threadId);
        if (!thread || thread.isDeleted) {
            return res.status(404).json({ message: "Discussion was not found." });
        }

        let reply = thread.replies.id(req.params.replyId);
        if (!reply || reply.isDeleted) {
            return res.status(404).json({ message: "Reply was not found." });
        }
        if (reply.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only edit your own reply." });
        }

        reply.title = checked.values.title;
        reply.content = checked.values.content;
        reply.imageUrl = checked.values.imageUrl;
        reply.updatedAt = new Date();
        await thread.save();

        res.json({ message: "Reply updated.", reply: publicReply(reply) });
    } catch (err) {
        res.status(500).json({ message: "The reply could not be updated." });
    }
});

router.delete("/threads/:threadId/replies/:replyId", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.threadId) || !mongoose.Types.ObjectId.isValid(req.params.replyId)) {
        return res.status(400).json({ message: "Invalid discussion or reply ID." });
    }

    try {
        let thread = await ForumThread.findById(req.params.threadId);
        if (!thread || thread.isDeleted) {
            return res.status(404).json({ message: "Discussion was not found." });
        }

        let reply = thread.replies.id(req.params.replyId);
        if (!reply || reply.isDeleted) {
            return res.status(404).json({ message: "Reply was not found." });
        }
        if (reply.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only delete your own reply." });
        }

        reply.isDeleted = true;
        reply.deletedAt = new Date();
        updateLastActivity(thread);
        await thread.save();

        res.json({ message: "Reply deleted." });
    } catch (err) {
        res.status(500).json({ message: "The reply could not be deleted." });
    }
});

module.exports = router;
