const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'src/app/api');
const apiBackupPath = path.join(__dirname, 'src/app/api_disabled');
const middlewarePath = path.join(__dirname, 'middleware.ts');
const middlewareBackupPath = path.join(__dirname, 'middleware.ts.bak');

if (process.argv[2] === 'disable') {
    if (fs.existsSync(apiPath)) {
        fs.renameSync(apiPath, apiBackupPath);
        console.log('API routes disabled for static export.');
    }
    if (fs.existsSync(middlewarePath)) {
        fs.renameSync(middlewarePath, middlewareBackupPath);
        console.log('Middleware disabled for static export.');
    }
} else if (process.argv[2] === 'enable') {
    if (fs.existsSync(apiBackupPath)) {
        fs.renameSync(apiBackupPath, apiPath);
        console.log('API routes re-enabled.');
    }
    if (fs.existsSync(middlewareBackupPath)) {
        fs.renameSync(middlewareBackupPath, middlewarePath);
        console.log('Middleware re-enabled.');
    }
}
