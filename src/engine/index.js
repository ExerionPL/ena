const path = require('path');
const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const express = require('express');

const configHelper = require('./helpers/configHelper');
const routerHelper = require('./helpers/routerHelper');
const fileListHelper = require('./helpers/fileListHelper');

function resolvePath(value, ...args) {
    const chunks = [__dirname, '..', value].concat(args);
    return path.isAbsolute(value) ? value : path.join.apply(path.join, chunks);
}

class AppEngine
{
    constructor() {
        this._app = null;
        this._beforePlugins = [];
        this._afterPlugins = [];
    }

    _moduleLoader(route, module) {
        const router = express.Router();
        ['get', 'post', 'put', 'delete'].forEach(k => {
            const handler = module[k];
            if (handler) {
                if (Array.isArray(handler)) // an array of handlers each for different route because of path parameters
                    handler.forEach(h => routerHelper(router, k, module, h));
                else
                    routerHelper(router, k, module);
            }
        });
        this._app.use(route, router);
    }

    _extractRoute(base, filePath) {
        return path
            .dirname(filePath)
            .substr(base.length)
            .replace(path.sep, '/')
            .replace(/^\/+|\/+$/g, '');
    }

    _loadModules(dir) {
        fileListHelper(dir, filePath => filePath.endsWith('module.js'), filePath => {
            const route = this._extractRoute(dir, filePath);
            require(filePath)(module => this._moduleLoader(`/${route}`, module));
        });
    }

    _importPlugin(plugin, list) {
        if (plugin) {
            if (!Array.isArray(plugin))
                plugin = [plugin];
            list.push.apply(list, plugin);
        }
    }

    _loadPlugins(dir) {
        fileListHelper(dir, filePath => filePath.endsWith('plugin.js'), filePath => {
            const plugin = require(filePath);
            this._importPlugin(plugin.before, this._beforePlugins);
            this._importPlugin(plugin.after, this._afterPlugins);
        }); 
    }

    run(config) {
        if (!config) throw 'Configuration not found!';
        
        // spawn nodes
        const infrastructureConfig = configHelper(config, 'infrastructure');
        let nodesToSpawn = infrastructureConfig.nodes < 0 ? numCPUs : (infrastructureConfig.nodes || 0);
        if (nodesToSpawn && cluster.isMaster) 
        {
            // list of ignored exit codes which will cause the worker not to respawn
            let ignoredCodes = infrastructureConfig.ignoreRespawnOnErrorCode === undefined ? [] : infrastructureConfig.ignoreRespawnOnErrorCode;
            if (!Array.isArray(ignoredCodes))
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

            // load plugins
            const pluginsPath = resolvePath(infrastructureConfig.pluginsDir || 'plugins');
            this._loadPlugins(pluginsPath);

            // adding 'before' plugins
            this._beforePlugins.forEach(p => p(this._app, config, resolvePath));

            // load modules
            const modulesPath = resolvePath(infrastructureConfig.modulesDir || 'modules');
            this._loadModules(modulesPath);

            // adding 'before' plugins
            this._afterPlugins.forEach(p => p(this._app, config, resolvePath));

            // launch the app
            const appConfig  = configHelper(config, 'app.host');
            this._app.listen(appConfig.port || 80, appConfig.host, (err) => {
                if (err) throw err;
            });
        }
    }
}

module.exports = AppEngine;
