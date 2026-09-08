const User = require("../models/User");

async function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Please log in first." });
    }

    try {
        let user = await User.findById(req.session.userId);

        if (!user) {
            req.session.destroy(function () {});
            return res.status(401).json({ message: "Your session is no longer valid." });
        }

        if (user.status === "locked") {
            return res.status(403).json({ message: "This account is locked." });
        }

        if (user.status === "deactivated") {
            return res.status(403).json({ message: "This account has been deactivated." });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ message: "Could not check the account." });
    }
}

function requireAdmin(req, res, next) {
    requireLogin(req, res, function () {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Administrator access is required." });
        }

        next();
    });
}

module.exports = {
    requireLogin: requireLogin,
    requireAdmin: requireAdmin
};
