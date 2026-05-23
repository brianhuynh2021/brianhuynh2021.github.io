(function($) {
    var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    var $resumeTools = $('#resume-local-tools');
    var $resumeUpload = $('#resume-upload');
    var $resumeStatus = $('#resume-upload-status');
    var $resumeDownload = $('#resume-download');
    var $resumeOpen = $('#resume-open');

    function setResumeLinks(resumeFile) {
        var relativeResumeFile = '../' + (resumeFile || 'HuynhNguyen_resume.pdf');

        $resumeDownload
            .attr('href', relativeResumeFile)
            .attr('download', resumeFile || 'HuynhNguyen_resume.pdf');
        $resumeOpen.attr('href', relativeResumeFile);
    }

    $.getJSON('../data/portfolio.json')
        .done(function(data) {
            document.title = data.profile.name + ' Resume';
            $('#resume-name').text(data.profile.name);
            $('#resume-title').text(data.profile.title);
            setResumeLinks(data.profile.resumeFile);
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
            $resumeStatus.text('Please attach a PDF file.');
            this.value = '';
            return;
        }

        var formData = new FormData();
        formData.append('resume', file);
        $resumeUpload.prop('disabled', true);
        $resumeStatus.text('Uploading resume...');

        $.ajax({
            url: '/__resume_upload',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false
        }).done(function() {
            var freshResumeUrl = '../HuynhNguyen_resume.pdf?v=' + Date.now();
            $resumeDownload.attr('href', freshResumeUrl).attr('download', 'HuynhNguyen_resume.pdf');
            $resumeOpen.attr('href', freshResumeUrl);
            $resumeStatus.text('Resume updated locally. Commit and push the PDF when you are ready to deploy it.');
        }).fail(function(xhr) {
            var message = 'Could not update resume.';

            if (xhr.responseJSON && xhr.responseJSON.error) {
                message = xhr.responseJSON.error;
            }

            $resumeStatus.text(message);
        }).always(function() {
            $resumeUpload.prop('disabled', false).val('');
        });
    });
})(jQuery);
