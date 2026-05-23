(function($) {
    var encryptedResumePath = '../documents/resume.enc';
    var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    var $resumeTools = $('#resume-local-tools');
    var $resumeUpload = $('#resume-upload');
    var $resumeStatus = $('#resume-upload-status');
    var $resumeDownload = $('#resume-download');
    var $resumeOpen = $('#resume-open');
    var $resumeNote = $('#resume-note');
    var $privateLink = $('#resume-private-link');
    var objectUrl = null;

    function setStatus(message, isError) {
        $resumeStatus.text(message || '');
        $resumeStatus.css('color', isError ? '#ffd6d6' : '#fff');
    }

    function bytesToBase64(bytes) {
        var binary = '';
        var chunkSize = 0x8000;

        for (var i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }

        return btoa(binary);
    }

    function base64ToBytes(base64) {
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);

        for (var i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }

    function arrayBufferToBase64(buffer) {
        return bytesToBase64(new Uint8Array(buffer));
    }

    function base64UrlEncode(buffer) {
        return arrayBufferToBase64(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function base64UrlDecode(value) {
        var base64 = value.replace(/-/g, '+').replace(/_/g, '/');

        while (base64.length % 4) {
            base64 += '=';
        }

        return base64ToBytes(base64);
    }

    function getPrivateKeyFromHash() {
        var params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        return params.get('key');
    }

    function importAesKey(keyBytes) {
        return window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }

    function setPdfObjectUrl(pdfBytes) {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }

        objectUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
        $('body').removeClass('resume-locked').addClass('resume-unlocked');
        $resumeNote.removeClass('resume-warning');
        $resumeDownload.attr('href', objectUrl).attr('download', 'HuynhNguyen_resume.pdf').removeAttr('hidden');
        $resumeOpen.attr('href', objectUrl).removeAttr('hidden');
    }

    function decryptResume(keyValue) {
        if (!keyValue) {
            $('body').addClass('resume-locked').removeClass('resume-unlocked');
            $resumeNote.addClass('resume-warning').text('Resume available on request. Contact me by email or Zalo.');
            return;
        }

        $resumeNote.removeClass('resume-warning').text('Unlocking resume...');

        fetch(encryptedResumePath + '?v=' + Date.now())
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Encrypted resume file is not available yet.');
                }

                return response.arrayBuffer();
            })
            .then(function(encryptedBuffer) {
                var encryptedBytes = new Uint8Array(encryptedBuffer);
                var keyBytes = base64UrlDecode(keyValue);
                var iv = encryptedBytes.slice(0, 12);
                var cipherText = encryptedBytes.slice(12);

                return importAesKey(keyBytes).then(function(key) {
                    return window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, cipherText);
                });
            })
            .then(function(pdfBuffer) {
                setPdfObjectUrl(pdfBuffer);
                $resumeNote.text('Resume unlocked.');
            })
            .catch(function(error) {
                $('body').addClass('resume-locked').removeClass('resume-unlocked');
                $resumeNote.addClass('resume-warning').text('Invalid resume link.');
                setStatus(error.message, true);
            });
    }

    function encryptPdf(file) {
        return file.arrayBuffer().then(function(pdfBuffer) {
            var pdfBytes = new Uint8Array(pdfBuffer);

            if (String.fromCharCode.apply(null, pdfBytes.slice(0, 4)) !== '%PDF') {
                throw new Error('The selected file does not look like a valid PDF.');
            }

            var keyBytes = window.crypto.getRandomValues(new Uint8Array(32));
            var iv = window.crypto.getRandomValues(new Uint8Array(12));

            return importAesKey(keyBytes).then(function(key) {
                return window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, pdfBuffer);
            }).then(function(cipherBuffer) {
                var cipherBytes = new Uint8Array(cipherBuffer);
                var encryptedBytes = new Uint8Array(iv.length + cipherBytes.length);

                encryptedBytes.set(iv, 0);
                encryptedBytes.set(cipherBytes, iv.length);

                return {
                    encryptedResume: bytesToBase64(encryptedBytes),
                    resumePdf: bytesToBase64(pdfBytes),
                    key: base64UrlEncode(keyBytes)
                };
            });
        });
    }

    $.getJSON('../data/portfolio.json')
        .done(function(data) {
            document.title = data.profile.name + ' Resume';
            $('#resume-name').text(data.profile.name);
            $('#resume-title').text(data.profile.title);
            encryptedResumePath = '../' + (data.profile.resumeFile || 'documents/resume.enc');
            decryptResume(getPrivateKeyFromHash());
        })
        .fail(function() {
            decryptResume(getPrivateKeyFromHash());
        });

    if (isLocalhost && $resumeTools.length) {
        $('body').addClass('local-resume-enabled');
        $resumeTools.removeAttr('hidden');
    }

    $resumeUpload.change(function() {
        var file = this.files && this.files[0];

        if (!file) {
            return;
        }

        if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
            setStatus('Please attach a PDF file.', true);
            this.value = '';
            return;
        }

        $resumeUpload.prop('disabled', true);
        setStatus('Encrypting resume...');

        encryptPdf(file)
            .then(function(payload) {
                var privateUrl = window.location.origin + window.location.pathname + '#key=' + payload.key;

                return fetch('/__resume_upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        encryptedResume: payload.encryptedResume,
                        resumePdf: payload.resumePdf,
                        privateUrl: privateUrl
                    })
                }).then(function(response) {
                    return response.json().then(function(body) {
                        if (!response.ok) {
                            throw new Error(body.error || 'Could not save encrypted resume.');
                        }

                        return { body: body, privateUrl: privateUrl };
                    });
                });
            })
            .then(function(result) {
                $privateLink.val(result.privateUrl).removeAttr('hidden').select();
                setStatus('Encrypted resume saved. Copy the private link below, then commit and push documents/resume.enc.');
                window.location.hash = result.privateUrl.split('#')[1];
                decryptResume(getPrivateKeyFromHash());
            })
            .catch(function(error) {
                setStatus(error.message, true);
            })
            .finally(function() {
                $resumeUpload.prop('disabled', false).val('');
            });
    });
})(jQuery);
