const path = require('path');
const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const chokidar = require('chokidar');
const helmet = require('helmet');

const configHelper = require('./helpers/configHelper');
const routerHelper = require('./helpers/routerHelper');

class AppEngine
{
    constructor() {
        this._app = null;
    }

    _moduleLoader(route, module) {
        const router = express.Router();
        ['get', 'post', 'put', 'delete'].forEach(k => {
            const handler = module[k];
            if (handler) {
                if (typeof(handler) === 'object') // an array of handlers each for different route because of path parameters
                    handler.forEach(h => routerHelper(router, k, module, h));
                else
                    routerHelper(router, k, module);
            }
        });
        this._app.use(route, router);
    }

    _extractRoute(base, filePath) {
        const parent = path.dirname(filePath);
        const raw = parent.substr(base.length);
        const replaced = raw.replace(path.sep, '/');
        return replaced.replace(/^\/+|\/+$/g, '');
    }

    _loadModules(dir) {
        chokidar.watch(dir).on('add', filePath => {
            if (filePath.endsWith('module.js')) {
                const route = this._extractRoute(dir, filePath);
                require(filePath)(module => this._moduleLoader(`/${route}`, module));
            }
        }); 
    }

    _loadPlugins(dir) {
        chokidar.watch(dir).on('add', p => {
            if (p.endsWith('plugin.js'))
                require(p)(this._app);
        }); 
    }

    run(config) {
        if (!config) throw 'Configuration not found!';
        
        const infrastructureConfig = configHelper(config, 'infrastructure');

        // spawn nodes
        let nodesToSpawn = infrastructureConfig.nodes < 0 ? numCPUs : (infrastructureConfig.nodes || 0);
        if (nodesToSpawn && cluster.isMaster) 
        {
            // list of ignored exit codes which will cause the worker not to respawn
            let ignoredCodes = infrastructureConfig.ignoreRespawnOnErrorCode === undefined ? [] : infrastructureConfig.ignoreRespawnOnErrorCode;
            if (typeof(ignoredCodes) !== 'object')
                ignoredCodes = [ignoredCodes];
            const autoRespawn = infrastructureConfig.autoRespawn || false;

            // spawn function used to ensure requested number of nodes is up and running
            const spawn = () => {
                cluster.fork().on('exit', (code, signal) => {
                    if (autoRespawn && !ignoredCodes.includes(code)) spawn();
                });
            };
            
            // spawning requested number of nodes
            while (nodesToSpawn--) spawn();
        } else {
            // create app
            this._app = express();
            
            // https://expressjs.com/en/advanced/best-practice-security.html
            this._app.disable('x-powered-by');
            this._app.use(helmet());

            // read config
            const appConfig  = configHelper(config, 'app.host');
            const appAccept  = configHelper(config, 'app.accept');
            const appCookies = configHelper(config, 'app.cookies')
            
            // configure middleware
            Object.keys(appAccept).forEach(a => {
                const parser = bodyParser[a];
                const args = appAccept[a];
                this._app.use(parser(args));
            });
            this._app.use(cookieParser(appCookies.secret, appCookies.options));

            // load modules
            let modulesPath = infrastructureConfig.modulesDir || 'modules';
            if (!path.isAbsolute(modulesPath))
                modulesPath = path.join(__dirname, '..', modulesPath);
            this._loadModules(modulesPath);

            // load plugins
            let pluginsPath = infrastructureConfig.pluginsDir || 'plugins';
            if (!path.isAbsolute(pluginsPath))
                pluginsPath = path.join(__dirname, '..', pluginsPath);
            this._loadPlugins(pluginsPath);

            this._app.listen(appConfig.port || 80, appConfig.host, (err) => {
                if (err) throw err;
            });
        }
    }
}

module.exports = AppEngine;
