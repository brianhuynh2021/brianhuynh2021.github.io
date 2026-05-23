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

    function createTimeline() {
        $('#experience-timeline').each(function() {
            var $this = $(this);
            var $userContent = $this.children('div');

            $userContent.each(function() {
                $(this).addClass('vtimeline-content').wrap('<div class="vtimeline-point"><div class="vtimeline-block"></div></div>');
            });

            $this.find('.vtimeline-point').each(function() {
                $(this).prepend('<div class="vtimeline-icon"><i class="fa fa-map-marker"></i></div>');
            });

            $this.find('.vtimeline-content').each(function() {
                var date = $(this).data('date');
                if (date) {
                    $(this).parent().prepend('<span class="vtimeline-date">'+date+'</span>');
                }
            });
        });
    }

    function renderPortfolio(data) {
        var resumeFile = data.profile.resumeFile || 'HuynhNguyen_resume.pdf';

        document.title = data.profile.name + ' Portfolio';
        $('#lead-content h1').text(data.profile.name);
        $('#lead-content h2').text(data.profile.title);
        $('#resume-download')
            .attr('href', resumeFile)
            .attr('download', resumeFile);

        var $about = $('#about .col-md-8').empty();
        (data.about || []).forEach(function(paragraph, index) {
            $('<p>').text(paragraph).appendTo($about);
            if (index < data.about.length - 1) {
                $('<br>').appendTo($about);
            }
        });

        var $skills = $('#skills ul').empty();
        (data.skills || []).forEach(function(skill) {
            $('<li>').text(skill).appendTo($skills);
        });

        var $projects = $('#projects .row').empty();
        (data.projects || []).forEach(function(project) {
            var $project = $('<div>').addClass('project shadow-large');
            var $image = $('<div>').addClass('project-image').append(
                $('<img>').attr('src', project.image).attr('alt', project.title).attr('style', 'height: 300px; width: 290px')
            );
            var $info = $('<div>').addClass('project-info');
            var $itemsWrap = $('<div>').attr('style', 'margin-top: -18px; display: flex; text-align: left;');
            var $items = $('<ul>');

            $('<h3>').text(project.title).appendTo($info);
            $('<p>').text(project.summary).appendTo($info);

            (project.items || []).forEach(function(item) {
                var $li = $('<li>');

                if (item.url) {
                    $('<a>')
                        .attr('href', item.url)
                        .attr('target', '_blank')
                        .text(item.linkText || item.text)
                        .appendTo($li);
                } else {
                    $li.text(item.text);
                }

                if (item.url && item.linkText !== item.text) {
                    $li.prepend(document.createTextNode(item.text + '  '));
                }

                $li.appendTo($items);
            });

            $itemsWrap.append($items);
            $info.append($itemsWrap);
            $project.append($image, $info).appendTo($projects);
        });

        var $timeline = $('#experience-timeline').empty();
        (data.experience || []).forEach(function(item) {
            var $entry = $('<div>').attr('data-date', item.date);
            var $heading = $('<h3>');
            var $company = $('<a>')
                .attr('href', item.companyUrl || '#')
                .attr('target', '_blank')
                .text(item.company);

            $heading.append($company);
            $('<h4>').text(item.role).appendTo($entry);
            var $details = $('<p>');
            (item.details || []).forEach(function(detail, detailIndex) {
                if (detailIndex) {
                    $('<br>').appendTo($details);
                }
                $details.append(document.createTextNode('- ' + detail));
            });
            $details.appendTo($entry);
            $entry.prepend($heading).appendTo($timeline);
        });
        createTimeline();

        var $education = $('#education').empty();
        $('<h2>').addClass('heading').text('Education').appendTo($education);
        (data.education || []).forEach(function(item) {
            var $block = $('<div>').addClass('education-block');
            $('<h3>').text(item.title).appendTo($block);

            if (item.date) {
                $('<span>').addClass('education-date').text(item.date).appendTo($block);
            }

            if (item.subtitle) {
                $('<h4>').text(item.subtitle).appendTo($block);
            }

            if (item.description) {
                $('<p>').text(item.description).appendTo($block);
            }

            if (item.items && item.items.length) {
                var $itemsWrap = $('<div>').attr('style', 'margin-top: 25px; display:flex;');
                var $items = $('<ul>');

                item.items.forEach(function(detail) {
                    var $li = $('<li>');

                    if (detail.url) {
                        $('<a>').attr('href', detail.url).text(detail.text).appendTo($li);
                    } else {
                        $li.text(detail.text);
                    }

                    $li.appendTo($items);
                });

                $itemsWrap.append($items).appendTo($block);
            }

            $block.appendTo($education);
        });

        $('#contact h2').text(data.contact.heading);
        var $contactLine = $('#contact > div').first();
        $contactLine.find('span:first').empty().append(
            document.createTextNode('Email: '),
            $('<a>').attr('href', 'mailto:' + data.contact.email).text(data.contact.email)
        );
        $contactLine.find('span:last').text('-  Tel/Zalo/WhatsApp: ' + data.contact.phone);
        $('#contact-form form').attr('action', data.contact.formAction);

        $('.copyright p').text(data.footer.copyright);
        var $social = $('.social ul').empty();
        (data.footer.social || []).forEach(function(item) {
            $('<li>').append(
                $('<a>').attr('href', item.url).attr('target', '_blank').attr('aria-label', item.label).append(
                    $('<i>').addClass('fa ' + item.icon).attr('aria-hidden', 'true')
                )
            ).appendTo($social);
        });
    }

    $.getJSON('data/portfolio.json')
        .done(renderPortfolio)
        .fail(createTimeline);

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
