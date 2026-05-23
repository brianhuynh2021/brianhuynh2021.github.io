(function() {
    var state = null;
    var form = document.getElementById('portfolio-form');
    var status = document.getElementById('admin-status');
    var saveButton = document.getElementById('save-portfolio');
    var mode = document.getElementById('admin-mode');
    var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    function setStatus(message, isError) {
        status.textContent = message || '';
        status.style.color = isError ? '#b91c1c' : '#2563eb';
    }

    function value(path) {
        return path.split('.').reduce(function(current, key) {
            return current && current[key];
        }, state) || '';
    }

    function setValue(path, newValue) {
        var keys = path.split('.');
        var target = state;

        keys.slice(0, -1).forEach(function(key) {
            target = target[key];
        });

        target[keys[keys.length - 1]] = newValue;
    }

    function section(id, title, buttonText, onClick) {
        var template = document.getElementById('section-template');
        var node = template.content.firstElementChild.cloneNode(true);
        var button = node.querySelector('.section-action');

        node.id = id;
        node.querySelector('h2').textContent = title;
        button.textContent = buttonText || '';
        button.hidden = !buttonText;

        if (onClick) {
            button.addEventListener('click', onClick);
        }

        form.appendChild(node);
        return node.querySelector('.section-body');
    }

    function field(container, label, path, multiline) {
        var wrapper = document.createElement('div');
        var inputLabel = document.createElement('label');
        var input = document.createElement(multiline ? 'textarea' : 'input');

        wrapper.className = 'field' + (multiline ? ' full' : '');
        inputLabel.textContent = label;
        input.value = value(path);
        input.dataset.path = path;
        input.addEventListener('input', function() {
            setValue(path, input.value);
        });

        wrapper.appendChild(inputLabel);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
        return input;
    }

    function fieldGrid(container) {
        var grid = document.createElement('div');
        grid.className = 'field-grid';
        container.appendChild(grid);
        return grid;
    }

    function removeButton(onClick) {
        var button = document.createElement('button');
        button.className = 'remove-button';
        button.type = 'button';
        button.textContent = 'Remove';
        button.addEventListener('click', onClick);
        return button;
    }

    function syncSimpleList(container, items, renderRow) {
        container.innerHTML = '';
        items.forEach(function(item, index) {
            renderRow(item, index);
        });
    }

    function renderProfile() {
        var body = section('profile', 'Profile');
        var grid = fieldGrid(body);
        field(grid, 'Name', 'profile.name');
        field(grid, 'Title', 'profile.title');
        field(grid, 'Resume file', 'profile.resumeFile');
    }

    function renderAbout() {
        var body = section('about', 'About', 'Add Paragraph', function() {
            state.about.push('');
            renderAll();
        });
        var list = document.createElement('div');
        list.className = 'repeat-list';
        body.appendChild(list);

        state.about.forEach(function(paragraph, index) {
            var card = document.createElement('div');
            var heading = document.createElement('div');
            var wrapper = document.createElement('div');
            var label = document.createElement('label');
            var input = document.createElement('textarea');

            card.className = 'repeat-card';
            heading.className = 'repeat-card-heading';
            wrapper.className = 'field full';
            label.textContent = 'Paragraph ' + (index + 1);
            input.value = paragraph;
            input.addEventListener('input', function() {
                state.about[index] = input.value;
            });
            heading.appendChild(removeButton(function() {
                state.about.splice(index, 1);
                renderAll();
            }));
            wrapper.appendChild(label);
            wrapper.appendChild(input);
            card.appendChild(heading);
            card.appendChild(wrapper);
            list.appendChild(card);
        });
    }

    function renderSkills() {
        var body = section('skills', 'Skills', 'Add Skill', function() {
            state.skills.push('');
            renderAll();
        });
        var list = document.createElement('div');
        list.className = 'inline-list';
        body.appendChild(list);

        syncSimpleList(list, state.skills, function(skill, index) {
            var row = document.createElement('div');
            var input = document.createElement('input');
            row.className = 'inline-row';
            input.value = skill;
            input.addEventListener('input', function() {
                state.skills[index] = input.value;
            });
            row.appendChild(input);
            row.appendChild(document.createElement('span'));
            row.appendChild(removeButton(function() {
                state.skills.splice(index, 1);
                renderAll();
            }));
            list.appendChild(row);
        });
    }

    function renderProjectItems(container, project, projectIndex) {
        var list = document.createElement('div');
        var add = document.createElement('button');
        var note = document.createElement('p');

        list.className = 'inline-list';
        add.type = 'button';
        add.className = 'section-action';
        add.textContent = 'Add Project Item';
        note.className = 'helper-text';
        note.textContent = 'Leave URL empty for plain text.';

        project.items.forEach(function(item, itemIndex) {
            var row = document.createElement('div');
            var text = document.createElement('input');
            var url = document.createElement('input');

            row.className = 'inline-row';
            text.placeholder = 'Text';
            text.value = item.text || '';
            text.addEventListener('input', function() {
                state.projects[projectIndex].items[itemIndex].text = text.value;
            });
            url.placeholder = 'URL';
            url.value = item.url || '';
            url.addEventListener('input', function() {
                state.projects[projectIndex].items[itemIndex].url = url.value;
                state.projects[projectIndex].items[itemIndex].linkText = text.value;
            });

            row.appendChild(text);
            row.appendChild(url);
            row.appendChild(removeButton(function() {
                state.projects[projectIndex].items.splice(itemIndex, 1);
                renderAll();
            }));
            list.appendChild(row);
        });

        add.addEventListener('click', function() {
            state.projects[projectIndex].items.push({ text: '', url: '', linkText: '' });
            renderAll();
        });

        container.appendChild(note);
        container.appendChild(list);
        container.appendChild(add);
    }

    function renderProjects() {
        var body = section('projects', 'Projects', 'Add Project', function() {
            state.projects.push({ title: '', image: '', summary: 'Working projects:', items: [] });
            renderAll();
        });
        var list = document.createElement('div');
        list.className = 'repeat-list';
        body.appendChild(list);

        state.projects.forEach(function(project, index) {
            var card = document.createElement('div');
            var heading = document.createElement('div');
            var grid = fieldGrid(card);

            card.className = 'repeat-card';
            heading.className = 'repeat-card-heading';
            heading.appendChild(removeButton(function() {
                state.projects.splice(index, 1);
                renderAll();
            }));
            card.insertBefore(heading, grid);
            field(grid, 'Title', 'projects.' + index + '.title');
            field(grid, 'Image path', 'projects.' + index + '.image');
            field(grid, 'Summary', 'projects.' + index + '.summary');
            renderProjectItems(card, project, index);
            list.appendChild(card);
        });
    }

    function renderExperience() {
        var body = section('experience', 'Experience', 'Add Experience', function() {
            state.experience.push({ date: '', company: '', companyUrl: '', role: '', details: [] });
            renderAll();
        });
        var list = document.createElement('div');
        list.className = 'repeat-list';
        body.appendChild(list);

        state.experience.forEach(function(item, index) {
            var card = document.createElement('div');
            var heading = document.createElement('div');
            var grid = fieldGrid(card);
            var details = document.createElement('div');
            var detailsInput = document.createElement('textarea');
            var detailsLabel = document.createElement('label');

            card.className = 'repeat-card';
            heading.className = 'repeat-card-heading';
            heading.appendChild(removeButton(function() {
                state.experience.splice(index, 1);
                renderAll();
            }));
            card.insertBefore(heading, grid);
            field(grid, 'Date', 'experience.' + index + '.date');
            field(grid, 'Company', 'experience.' + index + '.company');
            field(grid, 'Company URL', 'experience.' + index + '.companyUrl');
            field(grid, 'Role', 'experience.' + index + '.role');

            details.className = 'field full';
            detailsLabel.textContent = 'Details, one per line';
            detailsInput.value = item.details.join('\n');
            detailsInput.addEventListener('input', function() {
                state.experience[index].details = detailsInput.value.split('\n').filter(Boolean);
            });
            details.appendChild(detailsLabel);
            details.appendChild(detailsInput);
            card.appendChild(details);
            list.appendChild(card);
        });
    }

    function renderEducation() {
        var body = section('education', 'Education', 'Add Education', function() {
            state.education.push({ title: '', date: '', subtitle: '', description: '', items: [] });
            renderAll();
        });
        var list = document.createElement('div');
        list.className = 'repeat-list';
        body.appendChild(list);

        state.education.forEach(function(item, index) {
            var card = document.createElement('div');
            var heading = document.createElement('div');
            var grid = fieldGrid(card);

            card.className = 'repeat-card';
            heading.className = 'repeat-card-heading';
            heading.appendChild(removeButton(function() {
                state.education.splice(index, 1);
                renderAll();
            }));
            card.insertBefore(heading, grid);
            field(grid, 'Title', 'education.' + index + '.title');
            field(grid, 'Date', 'education.' + index + '.date');
            field(grid, 'Subtitle', 'education.' + index + '.subtitle');
            field(grid, 'Description', 'education.' + index + '.description', true);
            renderEducationItems(card, item, index);
            list.appendChild(card);
        });
    }

    function renderEducationItems(container, education, educationIndex) {
        var list = document.createElement('div');
        var add = document.createElement('button');

        list.className = 'inline-list';
        add.type = 'button';
        add.className = 'section-action';
        add.textContent = 'Add Education Item';

        education.items.forEach(function(item, itemIndex) {
            var row = document.createElement('div');
            var text = document.createElement('input');
            var url = document.createElement('input');

            row.className = 'inline-row';
            text.placeholder = 'Text';
            text.value = item.text || '';
            text.addEventListener('input', function() {
                state.education[educationIndex].items[itemIndex].text = text.value;
            });
            url.placeholder = 'URL';
            url.value = item.url || '';
            url.addEventListener('input', function() {
                state.education[educationIndex].items[itemIndex].url = url.value;
            });
            row.appendChild(text);
            row.appendChild(url);
            row.appendChild(removeButton(function() {
                state.education[educationIndex].items.splice(itemIndex, 1);
                renderAll();
            }));
            list.appendChild(row);
        });

        add.addEventListener('click', function() {
            state.education[educationIndex].items.push({ text: '', url: '' });
            renderAll();
        });

        container.appendChild(list);
        container.appendChild(add);
    }

    function renderContact() {
        var body = section('contact', 'Contact');
        var grid = fieldGrid(body);
        field(grid, 'Heading', 'contact.heading');
        field(grid, 'Email', 'contact.email');
        field(grid, 'Phone', 'contact.phone');
        field(grid, 'Form action', 'contact.formAction');
    }

    function renderAll() {
        form.innerHTML = '';
        renderProfile();
        renderAbout();
        renderSkills();
        renderProjects();
        renderExperience();
        renderEducation();
        renderContact();
    }

    function savePortfolio() {
        if (!isLocalhost) {
            setStatus('Saving is only available from localhost.', true);
            return;
        }

        saveButton.disabled = true;
        setStatus('Saving portfolio data...');

        fetch('/__portfolio_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state, null, 2)
        }).then(function(response) {
            return response.text().then(function(text) {
                var body = {};

                try {
                    body = text ? JSON.parse(text) : {};
                } catch (error) {
                    throw new Error('Save endpoint is not available. Stop the current server and run npm start again.');
                }

                if (!response.ok) {
                    throw new Error(body.error || 'Could not save portfolio data.');
                }

                return body;
            });
        }).then(function() {
            setStatus('Saved. Preview the site, then commit and push data/portfolio.json.');
        }).catch(function(error) {
            setStatus(error.message, true);
        }).finally(function() {
            saveButton.disabled = false;
        });
    }

    if (!isLocalhost) {
        saveButton.disabled = true;
        mode.textContent = 'Preview only. Run npm start locally to edit.';
    } else {
        mode.textContent = 'Editing local files.';
    }

    saveButton.addEventListener('click', savePortfolio);

    fetch('data/portfolio.json?admin=' + Date.now())
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Could not load portfolio data.');
            }

            return response.json();
        })
        .then(function(data) {
            state = data;
            renderAll();
            setStatus('');
        })
        .catch(function(error) {
            setStatus(error.message, true);
        });
})();
