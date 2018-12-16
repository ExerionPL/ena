# ENA
Extensible Node Application is simple node app, that serve as a backend app. You can easily add endpoints to this app by adding module.js files to `module` folder.
For more information see `/modules/Test/module.js` file.
General guidelines for creating endpoint:
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
  - before\[method\] - runs before handler, can modify request specificaly for this handler, receives expressjs request object
  - \[method\] - main handler of the method, will receive declared paramters autowired from request accordingly to the names
  - after\[method\] - runs after handler, receives expressjs request and response objects


## License

[The MIT License](https://opensource.org/licenses/MIT) @ 2018