const configHelper = require('./../engine/helpers/configHelper');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const errorHandling = require('./../engine/middlewares/errorHandling');
const unresolvedHandler = require('./../engine/middlewares/unresolvedHandler');

module.exports = {
    before: (app, cfg, resolvePath) => {
        // https://expressjs.com/en/advanced/best-practice-security.html
        app.disable('x-powered-by');
        app.use(helmet());

        const appAccept  = configHelper(cfg, 'app.accept');
        Object.keys(appAccept).forEach(a => {
            const parser = bodyParser[a];
            const args = appAccept[a];
            app.use(parser(args));
        });

        const appCookies = configHelper(cfg, 'app.cookies');
        app.use(cookieParser(appCookies.secret, appCookies.options));
    },
    after: (app, cfg, resolvePath) => {

        // error handling
        const logsDir = configHelper(cfg, 'infrastructure.logsDir');
        const logsPath = resolvePath(logsDir || 'logs');
        app.use(errorHandling(logsPath));
        
        // when no handler has been executed, response will not be finished, so at this point, we can safely assume, that no route has been resolved
        app.use(unresolvedHandler);
    }
}