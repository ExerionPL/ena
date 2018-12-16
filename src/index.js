const path = require('path');
const fs = require('fs');
const AppEngine = require('./engine');

const configPath = path.join(__dirname, 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : null;

const app = new AppEngine();
app.run(config);