module.exports = (app) => {
    app.use((req, res, next) => {
        if (!res.finished)
            res.end();
        return next();
    })
};