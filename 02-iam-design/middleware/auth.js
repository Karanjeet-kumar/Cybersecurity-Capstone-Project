function isAuthenticated(req, res, next) {
  if (!req.session?.user || !req.session?.accessToken) {
    return res.redirect("/login");
  }
  next();
}

function hasScope(scope) {
  return (req, res, next) => {
    const permissions = req.session?.permissions || [];
    if (!permissions.includes(scope)) {
      return res.status(403).render("error", {
        title: "Access denied",
        message: `Your account does not have the ${scope} permission.`,
        user: req.session?.user || null
      });
    }
    next();
  };
}

module.exports = { isAuthenticated, hasScope };
