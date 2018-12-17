![alt text](/img/logo-wide-128.png)

# ENA
Extensible Node Application is simple node app, that serve as a rest-style backend. It's purpose is to speed up app generation by focusing on adding business functionality rather than fighting with setup process. You can extend it with modules (endpoints) and plugins to add functionality. Treat it as a boilerplate, and feel free to modify it as you see fit.

Application uses:
- [expressjs](https://www.npmjs.com/package/express)
- [body-parser](https://www.npmjs.com/package/body-parser)
- [cookie-parser](https://www.npmjs.com/package/cookie-parser)
- [helmet](https://www.npmjs.com/package/helmet)
- [uuid](https://www.npmjs.com/package/uuid)

All copyrights for the above packages belong to their respective owners.

> Application is still under development, so more features will be added in future.

## Modules
You can easily add endpoints to this app by adding `module.js` files to `module` folder. For more information see `/modules/Test/module.js` file.

General guidelines for creating endpoint:
- folder structure inside `modules` folder will be used as an endpoint route, e.g.:
  - `modules/user/module.js` -> `http://example.com/user`
  - `modules/article/details/module.js` -> `http://example.com/article/details`
- use 4 rest methods: GET, POST, PUT and DELETE
- each method should define it's parameters as follows:
  - parameters starting with underscore (`_`) will be retrieved from path
  - parameters starting with dollar sign (`$`) will be retrieved from body
  - parameters without aformentioned prefixes will be retrieved from query string
  - all parameters will be autowired
- method should return one of:
  - data object - which will be serialized
  - function that will receive expressjs response object as an argument
  - object with render method that will be invoked the same way as above function
- each method has it's lifecycle:
  - canAccess\[method\] - returns boolean value indicating whether user have access to specific endpoint or not, receives expressjs request object 
  - before\[method\] - runs before handler, can modify request specificaly for this handler, receives expressjs request and response objects
  - \[method\] - main handler of the method, will receive declared paramters autowired from request accordingly to the names, you can provide an array of handlers with different path parameters, and they will be autowired to respective paths (build from path parameters). It is important to follow proper order of handlers, as it may lead to unwanted errors when resolving route handler. Also, remember, that it's the number of path parameters that distincts the path, not the names and order.
  - after\[method\] - runs after handler, receives expressjs request and response objects

(not the best) Example:
```javascript
const getUser = require('./../common/getUser');
const taskService = require('./../common/taskService');
const sendMessage = require('./../common/sendMessage');

module.exports = router => {
    router({
        canAccessPut: req => req.cookie.userId != null,
        beforePut: (req, res) => req.body.user = getUser(req.cookie.userId),
        put: (_id, $description, $user) => {
            const s = new taskService();
            return s.updateTask({
                id: _id,
                description: $description,
                userId: $user.id
            });
        },
        afterPut: (req, res) => {
            if (res.statusCode == 200) {
                const s = new taskService();
                const task = s.getTask(req.params.id); // note, that id parameter from path does not use '_' character in it's name
                const user = req.body.user; // body parameters in request object also does not use prefix
                sendMessage(user.email, `Task ${task.name} has been successfully updated`);
            }
        }
    });
};
```

## Plugins
Application allows for defining own plugins, they are simple functions that accespt express app object. They are defined within `plugins` directory, as a `plugin.js` file within it's respective folder, e.g. `/plugins/ResponseAutoClose/plugin.js`

## Automatic modules and plugins detection
Both `modules` and `plugins` folders are scanned on application start, and required files are loaded in order to build middlewares for express app.
you do not need to manualy load files from those folders.

## Error handling
By default, two additional middlewares are loaded:
 - unresolvedHandler - handles sistuation when the requested route has not been resolved (no route handler has been launched) and returns 404 response
 - errorHandling - handles errors returned by any previous middleware by returning 500 resposne and logging the error into file on hard drive in specified location [see Configuration section](#configuration)

## Configuration
Defined in `config.json` file allows to define following options:
```javascript
{
    "app": {
        "host": {
            "port": Number?, default = 80,
            "host": String?, default = "localhost"
        },
        "accept": {
            "json": bodyParser.OptionsJson?,
            "text": bodyParser.OptionsText?,
            "urlencoded": bodyParser.OptionsUrlencoded?,
            "raw": bodyParser.Options?
        }
    },
    "infrastructure": {
        "nodes": Number?, default = 0,
        "autoRespawn": Boolean,
        "ignoreRespawnOnErrorCode": Number|Number[],
        "modulesDir": String?, default = "modules",
        "pluginsDir": String?, default = "plugins",
        "logsDir": String?, default = "logs"
    }
}
```

`nodes` setting indicates how much worker nodes will be spawned, negative value will spawn maximum efficient number of workers (1 per CPU core),
0 will not spawn any worker, instead application will work as a single thread app, positive value will spawn exact number of workers.

`autoRespawn` setting indicates whether workers should be respawned if they've been closed.

`ignoreRespawnOnErrorCode` setting contains exit codes which will cause worker process not to respawn (necessary shutting down worker if needed).

Both `modulesDir` and `pluginsDir` can be either absolute or relative. If relative, they will be rooted to main app directory.

## License

[The MIT License](https://opensource.org/licenses/MIT) @ 2018
