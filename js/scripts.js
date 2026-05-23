/*!
    Title: Dev Portfolio Template
    Version: 1.2.1
    Last Change: 08/27/2017
    Author: Ryan Fitzgerald
    Repo: https://github.com/RyanFitzgerald/devportfolio-template
    Issues: https://github.com/RyanFitzgerald/devportfolio-template/issues

    Description: This file contains all the scripts associated with the single-page
    portfolio website.
*/

(function($) {

    // Remove no-js class
    $('html').removeClass('no-js');

    // Animate to section when nav is clicked
    $('header a').click(function(e) {

        // Treat as normal link if no-scroll class
        if ($(this).hasClass('no-scroll')) return;

        e.preventDefault();
        var heading = $(this).attr('href');
        var scrollDistance = $(heading).offset().top;

        $('html, body').animate({
            scrollTop: scrollDistance + 'px'
        }, Math.abs(window.pageYOffset - $(heading).offset().top) / 1);

        // Hide the menu once clicked if mobile
        if ($('header').hasClass('active')) {
            $('header, body').removeClass('active');
        }
    });

    // Scroll to top
    $('#to-top').click(function() {
        $('html, body').animate({
            scrollTop: 0
        }, 500);
    });

    // Scroll to first element
    $('#lead-down span').click(function() {
        var scrollDistance = $('#lead').next().offset().top;
        $('html, body').animate({
            scrollTop: scrollDistance + 'px'
        }, 500);
    });

    // Create timeline
    $('#experience-timeline').each(function() {

        $this = $(this); // Store reference to this
        $userContent = $this.children('div'); // user content

        // Create each timeline block
        $userContent.each(function() {
            $(this).addClass('vtimeline-content').wrap('<div class="vtimeline-point"><div class="vtimeline-block"></div></div>');
        });

        // Add icons to each block
        $this.find('.vtimeline-point').each(function() {
            $(this).prepend('<div class="vtimeline-icon"><i class="fa fa-map-marker"></i></div>');
        });

        // Add dates to the timeline if exists
        $this.find('.vtimeline-content').each(function() {
            var date = $(this).data('date');
            if (date) { // Prepend if exists
                $(this).parent().prepend('<span class="vtimeline-date">'+date+'</span>');
            }
        });

    });

    // Open mobile menu
    $('#mobile-menu-open').click(function() {
        $('header, body').addClass('active');
    });

    // Close mobile menu
    $('#mobile-menu-close').click(function() {
        $('header, body').removeClass('active');
    });

    // Load additional projects
    $('#view-more-projects').click(function(e){
        e.preventDefault();
        $(this).fadeOut(300, function() {
            $('#more-projects').fadeIn(300);
        });
    });

    // Local-only resume replacement. GitHub Pages never shows this control.
    var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    var $resumeTools = $('#resume-local-tools');
    var $resumeUpload = $('#resume-upload');
    var $resumeStatus = $('#resume-upload-status');
    var $resumeDownload = $('#resume-download');

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
            var freshResumeUrl = 'HuynhNguyen_resume.pdf?v=' + Date.now();
            $resumeDownload.attr('href', freshResumeUrl);
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
