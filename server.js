#!/usr/bin/env node
/**
 * Scripture Study Server
 * 
 * Usage: node server.js [port]
 * Default port: 3001
 * 
 * Access at: http://localhost:3001 or http://<your-ip>:3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 3001;
const STATIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Resolve the request against the static dir and refuse anything that
    // escapes it (path traversal) or touches a dotfile (.env, .git, ...).
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const filePath = path.resolve(STATIC_DIR, relPath);
    const insideStaticDir = filePath === STATIC_DIR || filePath.startsWith(STATIC_DIR + path.sep);
    const hasDotSegment = path.relative(STATIC_DIR, filePath)
        .split(path.sep).some(seg => seg.startsWith('.'));
    if (!insideStaticDir || hasDotSegment) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500);
            res.end(err.code === 'ENOENT' ? 'File not found' : 'Server error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    const ip = Object.values(require('os').networkInterfaces())
        .flat().find(n => n.family === 'IPv4' && !n.internal)?.address || 'localhost';
    console.log(`✓ Scripture Study running at http://localhost:${PORT} | http://${ip}:${PORT}`);
});
