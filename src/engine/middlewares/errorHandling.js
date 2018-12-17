const fs = require('fs');
const path = require('path');
const uuid = require('uuid');

module.exports = logsDirPath => ((error, req, res, next) => {
    if (!error) // no error here boss
        return next();
    
    const correlationId = uuid.v4();
    if (!res.headersSent) // if no response has been sent
        res.status(500).send(`An error occured, please contact administrator and provide him the following identifier: ${correlationId}`); // let's inform the user, that there was an error, and give him some information about it
    
    const logFilePath = path.join(logsDirPath, `${correlationId}.log`);
    if (!fs.existsSync(logsDirPath)) // let's make sure, that logs directory exists
        fs.mkdirSync(logsDirPath);
    
    fs.writeFile(logFilePath, error, () => {}); // we need to save information about the error to file, so that adminstrator can check it later
    return next(error); // let's not supress the error handlers
});