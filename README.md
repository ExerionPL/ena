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

#### Routing
ANE uses two factors to build routings:
 - folder structure inside `modules` folder to build routing, e.g.:
   - `modules/user/module.js` -> `http://example.com/user`
   - `modules/article/details/module.js` -> `http://example.com/article/details`
 - handlers path parameters e.g.: (for mode details see [Parameter binding and resolving](#parameter-binding-and-resolving))
``` javascript
{
    get: [
        () => {}, // this will be root GET handler '/'
        (_id) => {} // this will b sub-route GET handler '/:id'
    ]
}
```

#### REST style endpoint
Use 4 rest methods `GET`, `POST`, `PUT` and `DELETE` to indicate supported HTTP methods of the endpoint.

#### Parameter binding and resolving
Each handler method should define it's parameters as follows (all parameters will be autowired):
  - parameters starting with underscore (`_`) will be retrieved from path
  - parameters starting with dollar sign (`$`) will be retrieved from body
  - parameters without aformentioned prefixes will be retrieved from query string

#### Returned value
Method handler should return one of:
  - data object - which will be serialized
  - function that will receive expressjs response object as an argument
  - object with render method that will be invoked the same way as above function

#### Lifecycle
each method has it's lifecycle:
  - canAccess\[method\] - returns boolean value indicating whether user have access to specific endpoint or not, receives expressjs request object 
  - before\[method\] - runs before handler, can modify request specificaly for this handler, receives expressjs request and response objects
  - \[method\] - main handler of the method, will receive declared paramters autowired from request accordingly to the names, you can provide an array of handlers with different path parameters, and they will be autowired to respective paths (build from path parameters). It is important to follow proper order of handlers, as it may lead to unwanted errors when resolving route handler. Also, remember, that it's the number of path parameters that distincts the path, not the names and order.
  - after\[method\] - runs after handler, receives expressjs request and response objects

```javascript
{
    canAccessGet: req => {},
    beforeGet: (req, res) => {},
    get: (...args) => {},
    afterGet: (req, res) => {},

    canAccessPost: req => {},
    beforePost: (req, res) => {},
    post: (...args) => {},
    afterPost: (req, res) => {},

    canAccessPut: req => {},
    beforePut: (req, res) => {},
    put: (...args) => {},
    afterPut: (req, res) => {},

    canAccessGet: req => {},
    beforeGet: (req, res) => {},
    get: (...args) => {},
    afterGet: (req, res) => {},
}
```

#### Example module
Lets say, that we want to create REST endpoint to update tasks with route `PUT /my/tasks/{id}`. Endpoint will receive PUT request with task description to be updated, and afterwards will send message to user that hist task has been updated.

Create file `/modules/my/tasks/module.js` with the following content:

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

In above example:
 - `canAccessPut` method checks, if there is a cookie with `userId` parameter, which means, that user has been authenticated. If there is not `userId` in a cookie, pipeline will be broken, and `401 Unauthorized` message will be retured to user. No other methods will be invoked.
 - `beforePut` method retrieves user object, that will be used later
 - `put` method performs update
 - `afterPut` method sends message to the user with information about task

## Plugins
Application allows for defining own plugins, they are simple functions that accespt express app object. They are defined within `plugins` directory, as a `plugin.js` file within it's respective folder, e.g. `/plugins/ResponseAutoClose/plugin.js`
those files should export object with two properties `before` and `after`, that contains handler (or list of handlers), that will be executed accordingly before and after modules are loaded. each handler will recevie following parameters:
 - express app object
 - configuration retriever function
 - path resolving function that will enable path resolving from root of application

#### Example plugin
Create file `/plugins/RequestMeasurement/plugin.js` with following content:
```javascript
module.exports = {
    before: (app, cfg, pathResovler) => {
        if (cfg('debug'))
            app.use((req, res) => console.log(`Request started at ${new Date()}`));
    },
    after: (app, cfg, pathResovler) => {
        if (cfg('debug'))
            app.use((req, res) => console.log(`Request stopped at ${new Date()}`));
    }
};
```
In above example each request will display in console date and time of request start and stop, so that you can see how long it took to process this request.

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
