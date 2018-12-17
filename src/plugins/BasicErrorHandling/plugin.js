module.exports = (app) => {
    app.use((err, req, res, next) => {
        if (req.xhr)
            res.status(500).send({ error: 'Something failed!' });
        else
            next(err);
    });

    app.use((err, req, res, next) => {
        if (!err) // no error here boss
            return next();
        
        if (res.headersSent) // can't really do anything about it ...
            return next(err); // let's hope there is next middleware that can do something with it
        res.status(500).render('error', { error: err }); // don't know what it is, and don't really care, just dump it to user and forget about it
        
    });

    app.use((req, res, next) => {
        if (!res.finished) // no middleware has done what it was supposed to do?
            res.status(404).send(`Cannot find handler for requested resource: ${req.method} ${req.url}`); // seems like we couldn't find any middleware that could handle the request
        else
            next();
    })
};