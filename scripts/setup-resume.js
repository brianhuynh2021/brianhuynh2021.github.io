#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Parse .env manually — no extra dependency needed
const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) {
    console.error('Missing .env — copy .env.example and fill in your values.');
    process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce(function (acc, line) {
    const eq = line.indexOf('=');
    if (eq > 0) {
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim();
        if (k) acc[k] = v;
    }
    return acc;
}, {});

const password = env.RESUME_PASSWORD;
const aesKeyB64u = env.RESUME_AES_KEY;

if (!password) { console.error('RESUME_PASSWORD not set in .env'); process.exit(1); }
if (!aesKeyB64u) { console.error('RESUME_AES_KEY not set in .env'); process.exit(1); }

function pbkdf2(pass, salt, len) {
    return new Promise(function (resolve, reject) {
        crypto.pbkdf2(pass, salt, 100000, len, 'sha256', function (err, key) {
            if (err) reject(err); else resolve(key);
        });
    });
}

function aesGcmEncrypt(keyBuf, plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
    const pt = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
    const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
    const tag = cipher.getAuthTag();
    // layout: hex(iv:12) + hex(ct) + hex(tag:16)
    return iv.toString('hex') + ct.toString('hex') + tag.toString('hex');
}

function b64uToBuffer(b64u) {
    const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(b64 + '='.repeat((4 - b64.length % 4) % 4), 'base64');
}

function replaceVar(src, name, value) {
    return src.replace(new RegExp(`var ${name}\\s*=\\s*'[^']*'`), `var ${name} = '${value}'`);
}

async function main() {
    const signKeyBuf  = await pbkdf2(password, 'brianhuynh-resume-sign-v1',   32);
    const verifyKeyBuf = await pbkdf2(password, 'brianhuynh-resume-verify-v1', 32);
    const wrapKeyBuf  = await pbkdf2(password, 'brianhuynh-resume-wrap-v1',   32);

    const verifierHex    = aesGcmEncrypt(verifyKeyBuf, 'access-granted');
    const encryptedKeyHex = aesGcmEncrypt(wrapKeyBuf, b64uToBuffer(aesKeyB64u));
    const signKeyHex     = signKeyBuf.toString('hex');

    const voPath = path.join(root, 'js', 'verify.js');
    let voJs = fs.readFileSync(voPath, 'utf8');
    voJs = replaceVar(voJs, 'SIGN_SECRET_HEX',   signKeyHex);
    voJs = replaceVar(voJs, 'VERIFIER_HEX',      verifierHex);
    voJs = replaceVar(voJs, 'ENCRYPTED_KEY_HEX', encryptedKeyHex);
    fs.writeFileSync(voPath, voJs);

    const rjPath = path.join(root, 'js', 'resume.js');
    let rJs = fs.readFileSync(rjPath, 'utf8');
    rJs = replaceVar(rJs, 'SIGN_SECRET_HEX', signKeyHex);
    fs.writeFileSync(rjPath, rJs);

    console.log('✓ js/verify.js updated');
    console.log('✓ js/resume.js updated');
    console.log('  Commit and push to deploy the new secrets.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
