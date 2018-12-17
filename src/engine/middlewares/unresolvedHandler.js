module.exports = (req, res, next) => {
    if (!res.finished) // no middleware has done what it was supposed to do?
        res.status(404).send(`Cannot find handler for requested resource: ${req.method} ${req.url}`); // seems like we couldn't find any middleware that could handle the request
    else
        next();
};