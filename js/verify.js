(function () {
    // These three vars are filled in by: npm run setup-resume
    var SIGN_SECRET_HEX = '3075ea218982f17372721bb958715d96c5f1d92e3a1798d0e8b20596e77584ae';
    var VERIFIER_HEX = 'aa650672ee18816902cd864c5954220c8ecec3d0094ceda8fbce8ca2d97058ab924e30872cbb43d817bd';
    var ENCRYPTED_KEY_HEX = '57d3b1cf536bc7c44c94db725dee3856285adb6c86c155733e76240363fb9670cb6bb784f28dcc298efdeedb99ff994cffbcd70f01a3bbc0ff1b0dfa';

    if (!VERIFIER_HEX || !ENCRYPTED_KEY_HEX || !SIGN_SECRET_HEX) {
        document.getElementById('auth-section').innerHTML =
            '<p style="color:#ffd6d6;font-size:.95em">Setup required — run <code>npm run setup-resume</code> then push to GitHub.</p>';
        return;
    }

    var authSection     = document.getElementById('auth-section');
    var generateSection = document.getElementById('generate-section');
    var authForm        = document.getElementById('auth-form');
    var passwordInput   = document.getElementById('vo-password');
    var authError       = document.getElementById('auth-error');
    var daysSelect      = document.getElementById('vo-days');
    var generateBtn     = document.getElementById('vo-generate');
    var genError        = document.getElementById('gen-error');
    var resultDiv       = document.getElementById('vo-result');
    var linkOutput      = document.getElementById('vo-link');
    var copyBtn         = document.getElementById('vo-copy');
    var expiresLabel    = document.getElementById('vo-expires');

    var unlockedPassword = null;

    function hexToBytes(hex) {
        var bytes = new Uint8Array(hex.length / 2);
        for (var i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    function base64UrlEncode(bytes) {
        var binary = '';
        for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function pbkdf2(password, salt, bits) {
        return window.crypto.subtle.importKey(
            'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
        ).then(function (baseKey) {
            return window.crypto.subtle.deriveBits({
                name: 'PBKDF2',
                salt: new TextEncoder().encode(salt),
                iterations: 100000,
                hash: 'SHA-256'
            }, baseKey, bits);
        }).then(function (buf) {
            return new Uint8Array(buf);
        });
    }

    function aesGcmDecrypt(keyBytes, hex) {
        // layout: hex(iv:12) + hex(ct) + hex(tag:16)
        var iv  = hexToBytes(hex.slice(0, 24));
        var tag = hexToBytes(hex.slice(hex.length - 32));
        var ct  = hexToBytes(hex.slice(24, hex.length - 32));
        var ctWithTag = new Uint8Array(ct.length + tag.length);
        ctWithTag.set(ct);
        ctWithTag.set(tag, ct.length);

        return window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt'])
            .then(function (key) {
                return window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ctWithTag);
            });
    }

    function verifyPassword(pw) {
        return pbkdf2(pw, 'brianhuynh-resume-verify-v1', 256)
            .then(function (keyBytes) { return aesGcmDecrypt(keyBytes, VERIFIER_HEX); })
            .then(function (buf) { return new TextDecoder().decode(buf) === 'access-granted'; })
            .catch(function () { return false; });
    }

    function decryptResumeKey(pw) {
        return pbkdf2(pw, 'brianhuynh-resume-wrap-v1', 256)
            .then(function (keyBytes) { return aesGcmDecrypt(keyBytes, ENCRYPTED_KEY_HEX); })
            .then(function (rawBuf) { return base64UrlEncode(new Uint8Array(rawBuf)); });
    }

    function generateToken(aesKey, days) {
        var expiry    = Math.floor(Date.now() / 1000) + days * 86400;
        var expiryB64 = base64UrlEncode(new TextEncoder().encode(String(expiry)));
        var message   = expiryB64 + '.' + aesKey;
        var sigBytes  = hexToBytes(SIGN_SECRET_HEX);

        return window.crypto.subtle.importKey('raw', sigBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
            .then(function (sigKey) {
                return window.crypto.subtle.sign('HMAC', sigKey, new TextEncoder().encode(message));
            })
            .then(function (sigBuf) {
                return expiryB64 + '.' + aesKey + '.' + base64UrlEncode(new Uint8Array(sigBuf));
            });
    }

    authForm.addEventListener('submit', function (e) {
        e.preventDefault();
        authError.hidden = true;

        var pw = passwordInput.value;

        verifyPassword(pw).then(function (valid) {
            if (!valid) {
                authError.textContent = 'Incorrect password.';
                authError.hidden = false;
                passwordInput.value = '';
                passwordInput.focus();
                return;
            }
            unlockedPassword = pw;
            authSection.hidden = true;
            generateSection.hidden = false;
            daysSelect.focus();
        });
    });

    generateBtn.addEventListener('click', function () {
        if (!unlockedPassword) return;

        var days = parseInt(daysSelect.value, 10);
        genError.hidden = true;
        resultDiv.hidden = true;
        generateBtn.disabled = true;

        decryptResumeKey(unlockedPassword)
            .then(function (aesKey) { return generateToken(aesKey, days); })
            .then(function (token) {
                linkOutput.value = window.location.origin + '/my-resume/#t=' + token;

                var expDate  = new Date(Date.now() + days * 86400 * 1000);
                var dayLabel = days === 1 ? '1 day' : days + ' days';
                expiresLabel.textContent = 'Valid for ' + dayLabel + ' — expires ' +
                    expDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

                resultDiv.hidden = false;
                linkOutput.select();
            })
            .catch(function () {
                genError.textContent = 'Failed to generate link.';
                genError.hidden = false;
            })
            .then(function () { generateBtn.disabled = false; });
    });

    copyBtn.addEventListener('click', function () {
        linkOutput.select();
        var text = linkOutput.value;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(function () { document.execCommand('copy'); });
        } else {
            document.execCommand('copy');
        }
        copyBtn.textContent = 'Copied!';
        setTimeout(function () { copyBtn.textContent = 'Copy Link'; }, 2000);
    });
})();
