const parametersHelper = require('./parametersHelper');
const responseHelper = require('./responseHelper');

module.exports = (router, type, moduleObject) => {
    const FnName = type[0].toUpperCase() + type.substr(1);
    const handlers = [];

    // access checker
    const accessFn = moduleObject[`canAccess${FnName}`];
    if (accessFn) handlers.push((req, res, next) => {
        if (accessFn(req))
            next();
        else {
            res.writeHead(401, 'Unauthorized');
            res.end();
        }
    });

    // before handler
    const beforeFn = moduleObject[`before${FnName}`];
    if (beforeFn) handlers.push((req, res, next) => {
        beforeFn(req);
        next();
    });

    // action handler
    // path params starts with '_', body params starts with $, rest of them are from query string
    const fn = moduleObject[type];
    const args = parametersHelper(fn);
    const pathArgs = args.filter(a => a.indexOf('_') === 0);
    const path = pathArgs.reduce((p, c) => `${p}/:${c.substr(1)}`, '');

    const mappers = [];
    args.forEach(a => {
        if (a.indexOf('_') === 0) {
            const p = a.substr(1);
            mappers.push((req) => req.params[p]);
        } else if (a.indexOf('$') !== -1) {
            const p = a.substr(1);
            mappers.push((req) => req.body[p]);
        } else {
            mappers.push((req) => req.query[a]);
        }
    });
    handlers.push((req, res, next) => {
        const parameters = mappers.map(m => m(req));
        const result = fn.apply(fn, parameters);
        responseHelper(res, result);
        next();
    });

    // after handler
    const afterFn = moduleObject[`after${FnName}`];
    if (afterFn) handlers.push((req, res, next) => {
        afterFn(req, res);
        next();
    });

    // routing configuration
    router[type](path === '' ? '/' : path, handlers);
};
