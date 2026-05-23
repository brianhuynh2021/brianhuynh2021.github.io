const fs = require('fs');
const http = require('http');
const path = require('path');

const root = __dirname;
const resumeFile = path.join(root, 'HuynhNguyen_resume.pdf');
const portfolioDataFile = path.join(root, 'data', 'portfolio.json');
const port = Number(process.env.PORT) || 8080;
const host = '127.0.0.1';

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

function send(res, statusCode, body, contentType) {
    res.writeHead(statusCode, { 'Content-Type': contentType || 'text/plain; charset=utf-8' });
    res.end(body);
}

function safeStaticPath(urlPath) {
    const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
    const requested = cleanPath === '/' ? '/index.html' : cleanPath;
    const filePath = path.normalize(path.join(root, requested));

    if (!filePath.startsWith(root)) {
        return null;
    }

    return filePath;
}

function getBoundary(contentType) {
    const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
    return match && (match[1] || match[2]);
}

function extractUploadedPdf(buffer, boundary) {
    const body = buffer.toString('binary');
    const marker = `--${boundary}`;
    const parts = body.split(marker);

    for (const part of parts) {
        if (!part.includes('name="resume"') || !part.includes('filename=')) {
            continue;
        }

        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) {
            continue;
        }

        const headers = part.slice(0, headerEnd);
        if (/Content-Type:/i.test(headers) && !/Content-Type:\s*(application\/pdf|application\/octet-stream)/i.test(headers)) {
            throw new Error('Please upload a PDF file.');
        }

        let fileBody = part.slice(headerEnd + 4);
        fileBody = fileBody.replace(/\r\n--$/, '').replace(/\r\n$/, '');
        const fileBuffer = Buffer.from(fileBody, 'binary');

        if (fileBuffer.slice(0, 4).toString() !== '%PDF') {
            throw new Error('The selected file does not look like a valid PDF.');
        }

        return fileBuffer;
    }

    throw new Error('No resume PDF was found in the upload.');
}

function handleResumeUpload(req, res) {
    const boundary = getBoundary(req.headers['content-type']);

    if (!boundary) {
        send(res, 400, JSON.stringify({ error: 'Missing upload boundary.' }), 'application/json; charset=utf-8');
        return;
    }

    const chunks = [];
    let size = 0;
    const maxSize = 10 * 1024 * 1024;

    req.on('data', function(chunk) {
        size += chunk.length;

        if (size > maxSize) {
            send(res, 413, JSON.stringify({ error: 'Resume must be 10MB or smaller.' }), 'application/json; charset=utf-8');
            req.destroy();
            return;
        }

        chunks.push(chunk);
    });

    req.on('end', function() {
        try {
            const pdf = extractUploadedPdf(Buffer.concat(chunks), boundary);
            fs.writeFileSync(resumeFile, pdf);
            send(res, 200, JSON.stringify({ ok: true, file: 'HuynhNguyen_resume.pdf' }), 'application/json; charset=utf-8');
        } catch (error) {
            send(res, 400, JSON.stringify({ error: error.message }), 'application/json; charset=utf-8');
        }
    });
}

function readRequestBody(req, res, maxSize, onDone) {
    const chunks = [];
    let size = 0;

    req.on('data', function(chunk) {
        size += chunk.length;

        if (size > maxSize) {
            send(res, 413, JSON.stringify({ error: 'Request body is too large.' }), 'application/json; charset=utf-8');
            req.destroy();
            return;
        }

        chunks.push(chunk);
    });

    req.on('end', function() {
        onDone(Buffer.concat(chunks).toString('utf8'));
    });
}

function validatePortfolioData(data) {
    const requiredObjects = ['profile', 'contact', 'footer'];
    const requiredArrays = ['about', 'skills', 'projects', 'experience', 'education'];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Portfolio data must be a JSON object.');
    }

    requiredObjects.forEach(function(key) {
        if (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key])) {
            throw new Error(`Missing portfolio section: ${key}.`);
        }
    });

    requiredArrays.forEach(function(key) {
        if (!Array.isArray(data[key])) {
            throw new Error(`Portfolio section must be a list: ${key}.`);
        }
    });
}

function handlePortfolioDataSave(req, res) {
    readRequestBody(req, res, 1024 * 1024, function(body) {
        try {
            const data = JSON.parse(body);
            validatePortfolioData(data);
            fs.writeFileSync(portfolioDataFile, JSON.stringify(data, null, 2) + '\n');
            send(res, 200, JSON.stringify({ ok: true, file: 'data/portfolio.json' }), 'application/json; charset=utf-8');
        } catch (error) {
            send(res, 400, JSON.stringify({ error: error.message }), 'application/json; charset=utf-8');
        }
    });
}

const server = http.createServer(function(req, res) {
    if (req.method === 'POST' && req.url === '/__resume_upload') {
        handleResumeUpload(req, res);
        return;
    }

    if (req.method === 'POST' && req.url === '/__portfolio_data') {
        handlePortfolioDataSave(req, res);
        return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        send(res, 405, 'Method not allowed');
        return;
    }

    const filePath = safeStaticPath(req.url);

    if (!filePath) {
        send(res, 403, 'Forbidden');
        return;
    }

    fs.readFile(filePath, function(error, content) {
        if (error) {
            send(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Server error');
            return;
        }

        const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });

        if (req.method === 'HEAD') {
            res.end();
            return;
        }

        res.end(content);
    });
});

server.on('error', function(error) {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Try PORT=8081 npm start.`);
        process.exit(1);
    }

    throw error;
});

server.listen(port, host, function() {
    console.log(`Portfolio running at http://localhost:${port}`);
    console.log(`Open http://localhost:${port}/admin.html to update portfolio content locally.`);
});
