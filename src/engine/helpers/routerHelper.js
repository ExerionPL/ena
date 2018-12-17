const parametersHelper = require('./parametersHelper');
const responseHelper = require('./responseHelper');

module.exports = (router, type, moduleObject, handler) => {
    const FnName = type[0].toUpperCase() + type.substr(1);
    const handlers = [];

    // access checker
    const accessFn = moduleObject[`canAccess${FnName}`];
    if (accessFn) handlers.push((req, res, next) => {
        try {
            if (accessFn(req))
                next();
            else
                res.status(401).send('Unauthorized');
        } catch (ex) {
            next(ex);
        }
    });

    // before handler
    const beforeFn = moduleObject[`before${FnName}`];
    if (beforeFn) handlers.push((req, res, next) => {
        try {
            beforeFn(req, res);
            next();
        } catch (ex) {
            next(ex);
        }
    });

    // action handler
    // path params starts with '_', body params starts with $, rest of them are from query string
    const fn = handler || moduleObject[type];
    const args = parametersHelper(fn);
    const path = args.filter(a => a.startsWith('_')).reduce((p, c) => `${p}/:${c.substr(1)}`, '');

    const mappers = [];
    args.forEach(a => {
        const p = a.substr(1);
        switch(a[0]) {
            case '_':
                mappers.push((req) => req.params[p]);
                break;
            case '$':
                mappers.push((req) => req.body[p]);
                break;
            default:
                mappers.push((req) => req.query[a]);
                break;
        }
    });
    handlers.push((req, res, next) => {
        try {
            const parameters = mappers.map(m => m(req));
            const result = fn.apply(fn, parameters);
            responseHelper(res, result);
            next();
        } catch (ex) {
            next(ex);
        }
    });

    // after handler
    const afterFn = moduleObject[`after${FnName}`];
    if (afterFn) handlers.push((req, res, next) => {
        try {
            afterFn(req, res);
            next();
        } catch (ex) {
            next(ex);
        }
    });

    // routing configuration
    router[type](path === '' ? '/' : path, handlers);
};
