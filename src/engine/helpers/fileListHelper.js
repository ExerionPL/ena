const fs = require('fs');
const path = require('path');

const walkSync = (dir, filter, onMatchingFile) => {
    filter = filter || (p => true);
    const dirs = [];

    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory())
            dirs.push(filePath);
        else if (filter(filePath))
            onMatchingFile(filePath);

        dirs.forEach(d => walkSync(d, filter, onMatchingFile));
    });
};

module.exports = walkSync;