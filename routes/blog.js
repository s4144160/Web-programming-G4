const express = require("express");
const mongoose = require("mongoose");
const BlogPost = require("../models/BlogPost");
const auth = require("../middleware/auth");

const router = express.Router();

function authorName(user) {
    if (user.name && user.name.trim()) {
        return user.name.trim();
    }
    return user.username;
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

function cleanTags(value) {
    let input = value;
    if (typeof input === "string") {
        input = input.split(",");
    }
    if (!Array.isArray(input)) {
        return [];
    }

    let tags = [];
    let seen = {};
    for (let i = 0; i < input.length; i++) {
        if (typeof input[i] !== "string") {
            continue;
        }
        let tag = input[i].trim();
        let key = tag.toLowerCase();
        if (tag && !seen[key]) {
            tags.push(tag);
            seen[key] = true;
        }
    }
    return tags;
}

function validatePost(body) {
    let values = {
        title: typeof body.title === "string" ? body.title.trim() : "",
        content: typeof body.content === "string" ? body.content.trim() : "",
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() : "",
        tags: cleanTags(body.tags)
    };
    let errors = [];

    if (values.title.length < 3 || values.title.length > 150) {
        errors.push("Title must be between 3 and 150 characters.");
    }
    if (values.content.length < 10 || values.content.length > 10000) {
        errors.push("Main content must be between 10 and 10000 characters.");
    }
    if (values.tags.length < 1 || values.tags.length > 10) {
        errors.push("Add between 1 and 10 tags.");
    }
    for (let i = 0; i < values.tags.length; i++) {
        if (values.tags[i].length > 30 || !/^[a-z0-9][a-z0-9 &/_-]*$/i.test(values.tags[i])) {
            errors.push("Each tag must be 1 to 30 letters, numbers, spaces, hyphens, slashes or underscores.");
            break;
        }
    }
    if (!values.imageUrl) {
        errors.push("An image URL or project image path is required.");
    } else if (values.imageUrl.length > 500 || !validImageUrl(values.imageUrl)) {
        errors.push("Use a valid http(s) image URL or /assets/images/ project path.");
    }

    return { values: values, errors: errors };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateFromInput(value, endOfDay) {
    if (!value) {
        return null;
    }
    let time = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
    let date = new Date(value + time);
    if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return null;
    }
    return date;
}

function publicComment(comment) {
    return {
        id: comment._id.toString(),
        authorId: comment.authorId.toString(),
        authorName: comment.authorName,
        content: comment.content,
        createdAt: comment.createdAt
    };
}

function publicPost(post) {
    let comments = [];
    for (let i = 0; i < post.comments.length; i++) {
        comments.push(publicComment(post.comments[i]));
    }

    return {
        id: post._id.toString(),
        title: post.title,
        authorId: post.authorId.toString(),
        authorName: post.authorName,
        tags: post.tags,
        content: post.content,
        imageUrl: post.imageUrl,
        comments: comments,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        editedAt: post.editedAt
    };
}

router.get("/posts", async function (req, res) {
    let search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    let field = typeof req.query.field === "string" ? req.query.field : "all";
    let tag = typeof req.query.tag === "string" ? req.query.tag.trim() : "";
    let sort = typeof req.query.sort === "string" ? req.query.sort : "newest";
    let from = typeof req.query.from === "string" ? req.query.from.trim() : "";
    let to = typeof req.query.to === "string" ? req.query.to.trim() : "";
    let fields = ["all", "title", "author", "content", "tags", "image"];

    if (fields.indexOf(field) === -1) {
        return res.status(400).json({ message: "Search field is not valid." });
    }
    if (sort !== "newest" && sort !== "oldest") {
        return res.status(400).json({ message: "Sort must be newest or oldest." });
    }
    if (search.length > 100 || tag.length > 30) {
        return res.status(400).json({ message: "Search text or tag is too long." });
    }
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
        return res.status(400).json({ message: "Dates must use YYYY-MM-DD." });
    }

    let fromDate = dateFromInput(from, false);
    let toDate = dateFromInput(to, true);
    if ((from && !fromDate) || (to && !toDate) || (fromDate && toDate && fromDate > toDate)) {
        return res.status(400).json({ message: "The selected date range is not valid." });
    }

    let query = {};
    if (search) {
        let regex = new RegExp(escapeRegex(search), "i");
        if (field === "title") {
            query.title = regex;
        } else if (field === "author") {
            query.authorName = regex;
        } else if (field === "content") {
            query.content = regex;
        } else if (field === "tags") {
            query.tags = regex;
        } else if (field === "image") {
            query.imageUrl = regex;
        } else {
            query.$or = [
                { title: regex },
                { authorName: regex },
                { content: regex },
                { tags: regex },
                { imageUrl: regex }
            ];
        }
    }
    if (tag) {
        let exactTag = new RegExp("^" + escapeRegex(tag) + "$", "i");
        if (query.tags) {
            query.$and = [{ tags: query.tags }, { tags: exactTag }];
            delete query.tags;
        } else {
            query.tags = exactTag;
        }
    }
    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) {
            query.createdAt.$gte = fromDate;
        }
        if (toDate) {
            query.createdAt.$lte = toDate;
        }
    }

    try {
        let posts = await BlogPost.find(query).sort({ createdAt: sort === "oldest" ? 1 : -1 });
        let result = [];
        let availableTags = {};
        let allPosts = await BlogPost.find({}, { tags: 1 });
        for (let i = 0; i < allPosts.length; i++) {
            for (let j = 0; j < allPosts[i].tags.length; j++) {
                availableTags[allPosts[i].tags[j]] = true;
            }
        }

        for (let i = 0; i < posts.length; i++) {
            let summary = posts[i].content;
            if (summary.length > 220) {
                summary = summary.slice(0, 220) + "...";
            }
            result.push({
                id: posts[i]._id.toString(),
                title: posts[i].title,
                authorName: posts[i].authorName,
                tags: posts[i].tags,
                contentSummary: summary,
                imageUrl: posts[i].imageUrl,
                commentCount: posts[i].comments.length,
                createdAt: posts[i].createdAt,
                updatedAt: posts[i].updatedAt,
                editedAt: posts[i].editedAt
            });
        }

        res.json({ posts: result, count: result.length, availableTags: Object.keys(availableTags).sort() });
    } catch (err) {
        res.status(500).json({ message: "Blog posts could not be loaded." });
    }
});

router.get("/sitemap", async function (req, res) {
    try {
        let posts = await BlogPost.find({}, { title: 1 }).sort({ createdAt: -1 });
        let links = [];
        for (let i = 0; i < posts.length; i++) {
            links.push({
                label: posts[i].title,
                url: "/blog/blog-detail.html?id=" + posts[i]._id
            });
        }
        res.json({ links: links });
    } catch (err) {
        res.status(500).json({ message: "Blog sitemap data could not be loaded." });
    }
});

router.post("/posts", auth.requireLogin, async function (req, res) {
    let checked = validatePost(req.body || {});
    if (checked.errors.length) {
        return res.status(400).json({ message: checked.errors.join(" ") });
    }

    try {
        let post = await BlogPost.create({
            title: checked.values.title,
            authorId: req.user._id,
            authorName: authorName(req.user),
            tags: checked.values.tags,
            content: checked.values.content,
            imageUrl: checked.values.imageUrl,
            comments: []
        });
        res.status(201).json({ message: "Blog post published.", post: publicPost(post) });
    } catch (err) {
        res.status(500).json({ message: "The Blog post could not be published." });
    }
});

router.get("/posts/:postId", async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
        return res.status(400).json({ message: "Invalid Blog post ID." });
    }
    try {
        let post = await BlogPost.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: "Blog post was not found." });
        }
        res.json({ post: publicPost(post) });
    } catch (err) {
        res.status(500).json({ message: "The Blog post could not be loaded." });
    }
});

router.put("/posts/:postId", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
        return res.status(400).json({ message: "Invalid Blog post ID." });
    }
    let checked = validatePost(req.body || {});
    if (checked.errors.length) {
        return res.status(400).json({ message: checked.errors.join(" ") });
    }

    try {
        let post = await BlogPost.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: "Blog post was not found." });
        }
        if (post.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only edit your own Blog post." });
        }
        post.title = checked.values.title;
        post.tags = checked.values.tags;
        post.content = checked.values.content;
        post.imageUrl = checked.values.imageUrl;
        post.editedAt = new Date();
        await post.save();
        res.json({ message: "Blog post updated.", post: publicPost(post) });
    } catch (err) {
        res.status(500).json({ message: "The Blog post could not be updated." });
    }
});

router.delete("/posts/:postId", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
        return res.status(400).json({ message: "Invalid Blog post ID." });
    }
    try {
        let post = await BlogPost.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: "Blog post was not found." });
        }
        if (post.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only delete your own Blog post." });
        }
        await BlogPost.deleteOne({ _id: post._id });
        res.json({ message: "Blog post deleted." });
    } catch (err) {
        res.status(500).json({ message: "The Blog post could not be deleted." });
    }
});

router.post("/posts/:postId/comments", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
        return res.status(400).json({ message: "Invalid Blog post ID." });
    }
    let content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content || content.length > 1000) {
        return res.status(400).json({ message: "Comment is required and must be 1000 characters or less." });
    }

    try {
        let post = await BlogPost.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: "Blog post was not found." });
        }
        post.comments.push({
            authorId: req.user._id,
            authorName: authorName(req.user),
            content: content,
            createdAt: new Date()
        });
        await post.save();
        let comment = post.comments[post.comments.length - 1];
        res.status(201).json({ message: "Comment added.", comment: publicComment(comment) });
    } catch (err) {
        res.status(500).json({ message: "The comment could not be added." });
    }
});

router.delete("/posts/:postId/comments/:commentId", auth.requireLogin, async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId) || !mongoose.Types.ObjectId.isValid(req.params.commentId)) {
        return res.status(400).json({ message: "Invalid Blog post or comment ID." });
    }
    try {
        let post = await BlogPost.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: "Blog post was not found." });
        }
        let comment = post.comments.id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment was not found." });
        }
        if (comment.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only delete your own comment." });
        }
        comment.deleteOne();
        await post.save();
        res.json({ message: "Comment deleted." });
    } catch (err) {
        res.status(500).json({ message: "The comment could not be deleted." });
    }
});

module.exports = router;
