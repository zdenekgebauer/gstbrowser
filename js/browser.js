'use strict';

var GstBrowser = GstBrowser || {};

document.addEventListener('DOMContentLoaded', function () {
    var script = document.createElement('script');
    script.src = 'config.js';
    script.onload = GstBrowser.init;
    document.getElementsByTagName('head')[0].appendChild(script);
});

GstBrowser.init = function () {
    // parse parameters from url
    var match = /[\?&]config=([^&]+)/i.exec(window.location.search);
    var configSection = (match && match.length > 1 ? decodeURIComponent(match[1]) : 'default');
    match = /[\?&]lang=([^&]+)/i.exec(window.location.search);
    var lang = (match && match.length > 1 ? decodeURIComponent(match[1]) : 'en');

    var currentConfig = (GstBrowser.Config[configSection] !== undefined ? GstBrowser.Config[configSection] : null);
    if (currentConfig === null) {
        alert('missing config section ' + configSection);
    } else {
        currentConfig.connector = (currentConfig.connector !== undefined ? currentConfig.connector : null);
        currentConfig.lang = (currentConfig.lang !== undefined ? currentConfig.lang.substr(0, 2) : lang);
        currentConfig.css  = (currentConfig.css !== undefined ? currentConfig.css : 'css/default.css');
        currentConfig.baseUrl = (currentConfig.baseUrl !== undefined ? currentConfig.baseUrl : window.location.protocol + '//' + window.location.host + '/');
        currentConfig.uploadAccept = (currentConfig.uploadAccept !== undefined ? currentConfig.uploadAccept : '');
        currentConfig.uploadMaxSize = (currentConfig.uploadMaxSize !== undefined ? currentConfig.uploadMaxSize : null);
        currentConfig.callbackSubmit = (typeof currentConfig.callbackSubmit === 'function' ? currentConfig.callbackSubmit :  null);
        currentConfig.callbackStorno = (typeof currentConfig.callbackStorno === 'function' ? currentConfig.callbackStorno :  null);
        currentConfig.callbackInit = (typeof currentConfig.callbackInit === 'function' ? currentConfig.callbackInit :  null);
        currentConfig.configServer = (typeof currentConfig.configServer !== 'undefined' ? currentConfig.configServer : null);

        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.type = 'text/css';
        css.href = currentConfig.css;
        document.getElementsByTagName('head')[0].appendChild(css);

        // load language
        var script = document.createElement('script');
        script.src = 'js/lang/' + currentConfig.lang + '.js';
        script.onload = function () {
            GstBrowser.FileBrowser(GstBrowser.Config[configSection]);
        };
        document.getElementsByTagName('head')[0].appendChild(script);
    };
};

/**
 * @class GstFileBrowser javascript function related to browser window
 * @param {GstBrowser.Config} config configuration
 */
GstBrowser.FileBrowser = function (config) {
    /** @var {String} selected path relative to root folder */
    var selectedPath = '';
    /** @var {String} selected file or directory in current selected path */
    var selectedFile = null;
    /** @var {String} string or regexp to filter list of files */
    var filterFile = '';
    /** @var {Array} list of files and dirs in current selected path */
    var files = [];
    /** @var {Array} list of all directories */
    var tree = [];

    var nodeTree = document.getElementById('tree'),
        nodeFolder = document.getElementById('folder'),
        nodeFolderView = document.getElementById('fldView'),
        nodeFilter = document.getElementById('fldFilter'),
        nodeSelFile = document.getElementById('selectedFile'),
        nodeMsg = document.getElementById('msg'),

        butRename = document.getElementById('butRename'),
        butCopy = document.getElementById('butCopy'),
        butOk = document.getElementById('butOk'),
        butStorno = document.getElementById('butStorno'),

        panelMkDir = document.getElementById('panelMkdir'),
        butMkDir = document.getElementById('butMkdir'),
        butMkDirSubmit = document.getElementById('butSubmitMkdir'),

        panelDelete = document.getElementById('panelDelete'),
        butDelete = document.getElementById('butDelete'),
        butDeleteSubmit = document.getElementById('butSubmitDelete'),

        panelRename = document.getElementById('panelRename'),
        butRename = document.getElementById('butRename'),
        butRenameSubmit = document.getElementById('butSubmitRename'),

        panelCopy = document.getElementById('panelCopy'),
        butCopy = document.getElementById('butCopy'),
        butCopySubmit = document.getElementById('butSubmitCopy'),

        panelUpload = document.getElementById('panelUpload'),
        butUpload = document.getElementById('butUpload'),
        progressUpload = panelUpload.querySelector('tbody');


    /** @var {String} selected folderView list/thumbs */
    var folderView = nodeFolderView.value;

    var loadTree = function () {
        ajaxSend('tree', '', handleResponseLoadTree);
    };

    var handleResponseLoadTree = function (data) {
        if (data.status === 'OK') {
            tree = data.tree;
            refreshTree();
            return;
        }
        showErr('ErrLoadTree' + data.msg);
    };

    var refreshTree =  function () {
        var hasChildren = (tree[0].children !== undefined);
        var html = '<ul><li data-path="" class="collapsed' + (!hasChildren ? 'noSubfolder' : '') + '">' + (hasChildren ? '<span class="expand"> + </span>' : '')
             + '<span class="folder">' + tree[0].name + '</span>';
        if (hasChildren) {
            for (var i=0; i<tree[0].children.length; i++ ) {
                html  += formatTreeItem(tree[0].children[i]);
            }
        }
        html  += '</li></ul>';
        nodeTree.innerHTML = html;
        nodeTree.querySelector('span.folder').classList.add('selected');

        Array.prototype.forEach.call(nodeTree.querySelectorAll('span.folder'), function (el) {
            el.addEventListener('mousedown', function () {
                var currentItem = el.parentNode;
                var path = currentItem.getAttribute('data-path');
                while(currentItem.parentNode) {
                    currentItem = currentItem.parentNode;
                    if (currentItem.nodeName !== 'LI' && currentItem.nodeName !== 'UL') {
                        break;
                    }
                    if (currentItem.getAttribute('data-path') !== 'undefined' && currentItem.getAttribute('data-path') !== null && currentItem.getAttribute('data-path') !== '') {
                        path = currentItem.getAttribute('data-path') + '/' + path;
                    }
                }
                setPath(path);
            });

            el.addEventListener('drop', function (event) {
                event.preventDefault();

                var filename = event.dataTransfer.getData('text');
                if (filename === '') { // ignore drag from filesystem
                    return false;
                }
                var currentItem = this;
                var path = '';
                while(currentItem.parentNode) {
                    currentItem = currentItem.parentNode;
                    if (currentItem.nodeName !== 'LI' && currentItem.nodeName !== 'UL') {
                        break;
                    }
                    if (currentItem.getAttribute('data-path') !== 'undefined' && currentItem.getAttribute('data-path') !== null && currentItem.getAttribute('data-path') !== '') {
                        path = currentItem.getAttribute('data-path') + '/' + path;
                    }
                }
                panelCopy.querySelector('[name="new"]').value = path + filename;
                event.dataTransfer.dropEffect = (event.ctrlKey ? 'copy' : 'move'); // due msie10
                panelCopy.querySelector('[name="action"]').value = event.dataTransfer.dropEffect;
                panelCopy.classList.remove('hidden');
            });

            el.addEventListener('dragover', function (event) {
                event.preventDefault();
                event.dataTransfer.dropEffect = (event.ctrlKey ? 'copy' : 'move'); // dont work in msie10
                return false;
            });

        });

        Array.prototype.forEach.call(nodeTree.querySelectorAll('span.expand'), function (el) {
            el.addEventListener('mousedown', function (event) {
                var currentItem = el;
                while(currentItem.parentNode) {
                    currentItem = currentItem.parentNode;
                    if (currentItem.nodeName === 'LI') {
                        currentItem.classList.toggle('collapsed');
                        break;
                    }
                }
            });
        });


        loadFiles();
    };

    var formatTreeItem = function (treeItem) {
        var hasChildren = (treeItem.children !== undefined), y, ret;
        ret = '<ul><li data-path="' + treeItem.name + '" class="collapsed' + (!hasChildren ? ' noSubfolder' : '') + '">';
        if (hasChildren) {
            ret  += '<span class="expand"> + </span>';
        }
        ret  += '<span class="folder">' + treeItem.name + '</span>';
        if (hasChildren) {
            ret  += '<ul>';
            for (y=0;y<treeItem.children.length; y++) {
                ret  += formatTreeItem(treeItem.children[y]);
            }
            ret  += '</ul>';
        }
        ret  += '</li></ul>';
        return ret;
    };

    var loadFiles = function () {
        ajaxSend('files', '', handleResponseLoadFiles);
    };

    var handleResponseLoadFiles = function (data) {
        if (data.status === 'OK') {
            files = data.files;
            refreshFiles();
            return;
        }
        showErr('ErrLoadFiles' + data.msg);
    };

    var refreshFiles = function () {
        var displayed = [], i, y, filterStrings;

        selectedFile = '';

        // apply filter
        if (filterFile === '') {
            displayed = files;
        } else {
            filterStrings = filterFile.split('|');
            for (i=0;i<files.length;i++) {
                for (y=0;y<filterStrings.length;y++) {
                    if (files[i].name.toLowerCase().indexOf(filterStrings[y]) !== -1) {
                        displayed.push(files[i]);
                        break;
                    }
                }
            }
        }

        // sort by dir and name
        displayed.sort(function (obj1, obj2) {
            if (obj1.type === 'dir' && obj2.type !== 'dir') {
                return  -1;
            }
            if (obj1.type !== 'dir' && obj2.type === 'dir') {
                return 1;
            }
            return obj1.name < obj2.name ? -1 : 1;
        });

        if (folderView === 'thumbs') {
            nodeFolder.innerHTML = formatFilesAsThumbs(displayed);
        } else {
            nodeFolder.innerHTML = formatFilesAsTable(displayed);
        }


        Array.prototype.forEach.call(nodeFolder.querySelectorAll('[data-file]'), function (el) {
            el.addEventListener('mousedown', function () {
                setFile(this.getAttribute('data-file'));
            });
            el.addEventListener('dblclick', handlePassUrl);

            el.addEventListener('dragstart', function (event) {
                event.dataTransfer.setData('text', event.target.getAttribute('data-file'));
                return true;
            });
        });

    };

    var formatFilesAsThumbs = function (files) {
        var html = '';
        for (var i=0;i<files.length;i++) {
            html  += '<div data-file="' + files[i].name + '" data-type="' + files[i].type
                 + '" class="thumb thumb-' + (files[i].type === 'dir' ? 'dir' : getFileExtension(files[i].name))
                 + '" draggable="' + (files[i].type === 'file' ? 'true' : 'false') + '"><span class="image">';
            if (files[i].thumbnail !== null && files[i].thumbnail !== false && files[i].thumbnail.indexOf('data:image') !== -1) {
                html  += '<img src="' + files[i].thumbnail + '" alt="' + files[i].name + '" ';
                if (files[i].imgsize !== null) {
                    html  += ' title="' + files[i].name + ', ' + files[i].imgsize[0] + 'x' + files[i].imgsize[1] + 'px"';
                }
                html  += 'draggable="false" />';
            }
            html  += '</span><span class="name">' + files[i].name + '</span></div>';
        }
        return html;
    };

    var formatFilesAsTable = function (files) {
        var html = '<table><thead><tr><th colspan="2">' + translate('Filename') + '</th><th>' + translate('Size') + '</th><th>'
             + translate('Dimensions') + '</th><th>' + translate('Date') + '</th></tr></thead><tbody>';

        for (var i=0;i<files.length;i++) {
            var date = new Date(files[i].date);
            html  += '<tr data-file="' + files[i].name + '" data-type="' + files[i].type
                 + '" draggable="' + (files[i].type === 'file' ? 'true' : 'false') + '">'
                 + '<td class="icon icon-' + (files[i].type === 'dir' ? 'dir' : getFileExtension(files[i].name))
                 + '"></td><td class="name">' + files[i].name  + '</td><td>';
            if (files[i].size !== null) {
                html  += formatFilesize(files[i].size);
            }
            html  += '</td><td>';
            if (files[i].imgsize !== null) {
                html  += files[i].imgsize[0] + ' x ' + files[i].imgsize[0];
            }
            html  += '</td><td>' + formatShortDateTime(date) + '</td></tr>';
        }
        html  += '</tbody></table>';
        return html;
    };

    var getFileExtension = function (filename) {
        return filename.split('.').pop().toLowerCase();
    };

    var setPath = function (path) {
        selectedPath = path;
        Array.prototype.forEach.call(nodeTree.querySelectorAll('span.folder'), function (el) {
            el.classList.remove('selected');
        });

        // unfold branches
        var parts = selectedPath.split('/');

        for (var i=0; i<parts.length; i++) {
            var selector = 'ul';
            for (var y=0; y<i; y++) {
                selector += ' ul';
            }
            nodeTree.querySelector(selector + ' li[data-path="' + parts[y] + '"]').classList.remove('collapsed');
        }

        // highlight tree item
        if (selectedPath === '') {
            nodeTree.querySelector('ul li[data-path=""] span.folder').classList.add('selected');
        } else {
            selector = 'ul';
            for(var y=0; y<parts.length-1; y++) {
                selector += ' ul';
            }
            nodeTree.querySelector(selector + ' li[data-path="' + parts[parts.length-1] + '"] span.folder').classList.add('selected');
        }


        Array.prototype.forEach.call(document.querySelectorAll('[data-showpath]'), function (el) {
            el.innerHTML = selectedPath;
        });
        setFile('');
        loadFiles();
    };

    var setFile = function (filename) {
        selectedFile = null;
        Array.prototype.forEach.call(nodeFolder.querySelectorAll('[data-file]'), function (el) {
            el.classList.remove('selected');
        });
        for (var i=0;i<files.length;i++) {
            if (files[i].name === filename) {
                selectedFile = files[i];
                break;
            }
        }

        butDelete.disabled = (selectedFile === null);
        butRename.disabled = (selectedFile === null);
        butCopy.disabled = (selectedFile === null || selectedFile.type !== 'file');
        butOk.disabled = (selectedFile === null || selectedFile.type !== 'file');

        if (selectedFile === null) {
            nodeSelFile.innerHTML = '';
        } else {
            var html = '<div class="thumb thumb-' + (selectedFile.type === 'dir' ? 'dir' : getFileExtension(selectedFile.name)) + '">';
            if (selectedFile.thumbnail !== null && selectedFile.thumbnail.indexOf('data:image') !== -1) {
                html  += '<img src="' + selectedFile.thumbnail + '" alt="' + selectedFile.name + '" />';
            }
            html  += '</div><p>' + selectedFile.name + '<br />';
            if (selectedFile.size !== null) {
                html  += translate('Size') + ':' + formatFilesize(selectedFile.size) + '<br />';
            }
            if (selectedFile.imgsize !== null) {
                html  += translate('Dimensions') + ':' + selectedFile.imgsize[0] + ' x ' + selectedFile.imgsize[1] + '<br />';
            }
            var date = new Date(selectedFile.date);
            html  += translate('Date') + ':' + date.toLocaleString() + '</p>';
            nodeSelFile.innerHTML = html;

            Array.prototype.forEach.call(document.querySelectorAll('[data-showfile]'), function (el) {
                el.innerHTML = selectedFile.name;
            });
            nodeFolder.querySelector('[data-file="' + selectedFile.name + '"]').classList.add('selected');
        }
    };

    var mkDir = function () {
        ajaxSend('mkdir', 'dir=' + panelMkDir.querySelector('input[name="newdir"]').value, handleResponseMkDir);
    };

    var handleResponseMkDir = function (data) {
        if (data.status === 'OK') {
            tree = data.tree;
            files = data.files;
            refreshTree();
            panelMkDir.classList.add('hidden');
            return;
        }
        showErr('ErrMkDir' + data.msg);
    };

    var del = function () {
        ajaxSend('delete', 'name=' + selectedFile.name, handleResponseDelete);
    };

    var handleResponseDelete = function (data) {
        if (data.status === 'OK') {
            files = data.files;
            if (data.tree !== undefined) {
                tree = data.tree;
                refreshTree();
            } else {
                refreshFiles();
                setFile('');
            }
            panelDelete.classList.add('hidden');
            return;
        }
        showErr('ErrDelete' + data.msg);
    };

    var rename = function () {
        ajaxSend('rename', 'old=' + selectedFile.name + '&new=' + panelRename.querySelector('input[name="new"]').value, handleResponseRename);
    };

    var handleResponseRename = function (data) {
        if (data.status === 'OK') {
            files = data.files;
            if (data.tree !== undefined) {
                tree = data.tree;
                refreshTree();
            } else {
                refreshFiles();
            }
            panelRename.classList.add('hidden');
        }
        showErr('ErrRename' + data.msg);
    };


    var copy = function () {
        ajaxSend(panelCopy.querySelector('[name="action"]').value, 'old=' + selectedFile.name + '&new=' + panelCopy.querySelector('input[name="new"]').value, handleResponseCopy);
    };
    var handleResponseCopy = function (data) {
        if (data.status === 'OK') {
            if (data.tree !== undefined) {
                tree = data.tree;
                refreshTree();
            }
            if (data.files !== undefined) {
                files = data.files;
                refreshFiles();
            }
            panelCopy.classList.add('hidden');
        }
        showErr('ErrCopy' + data.msg);
    };

    var formatFilesize = function (bytes) {
        var sizes = ['B', 'kB', 'MB', 'GB', 'TB'], i;
        if (bytes <= 0) {
            return '0 B';
        }
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2)  +  ' '  +  sizes[[i]];
    };

    var formatShortDateTime = function (date) {
        var time = date.toLocaleTimeString();
        time = time.substr(0, time.length-3);
        return date.getDate() + '.' + (date.getMonth()  +  1) + '.' + date.getFullYear() + ' ' + time;
    };

    var translate = function (token) {
        return (GstBrowser.Translations[token] === undefined ? token : GstBrowser.Translations[token]);
    };

    var translatePage = function () {
        Array.prototype.forEach.call(document.querySelectorAll('.i18n'), function (el) {
            el.innerHTML = translate(el.innerHTML);
            if (el.title !== '') {
                el.title = translate(el.title);
            }
            if (typeof el.placeholder !== 'undefined') {
                el.placeholder = translate(el.placeholder);
            }
        });
    };

    var showErr = function (msg) {
        nodeMsg.querySelector('span').innerHTML = translate(msg);
        nodeMsg.classList.remove('hidden');
    };

    var ajaxSend = function (action, data, callback) {
        var method = (action === 'tree' || action === 'files' ? 'GET' : 'POST');
        var postdata = 'config=' + config.configServer + '&action=' + action + '&path=' + selectedPath + '&' + data;
        var url = config.connector  +
            (method === 'GET' ? '?config=' + config.configServer + '&action=' + action + '&path=' + selectedPath + data + '&r=' + Math.random() : '');
        var xhr = new XMLHttpRequest;

        xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    try {
                        var data = JSON.parse(this.responseText);
                    } catch(e) {
                        showErr('ErrLoad');
                        return;
                    }
                    callback(data);
                } else {
                    showErr('ErrLoad');
                }
            }
        };
        //xhr.timeout = 10000;
        xhr.ontimeout = function () {
            showErr('ErrLoadTimeout');
        };

        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
        if (method === 'GET') {
            xhr.send();
        } else {
            xhr.send(postdata);
        }
    };

    var handlePassUrl = function () {
        if (selectedFile.type === 'dir') {
            setPath(selectedPath + '/' + selectedFile.name);
            return;
        }

        if (!butOk.disabled) {
            if (config.callbackSubmit !== null) {
                config.callbackSubmit(config.baseUrl + '/' + selectedPath + (selectedPath !== '' ? '/' : '') + selectedFile.name);
            }
        }

    };

    butOk.addEventListener('mousedown', handlePassUrl);

    butStorno.addEventListener('mousedown', function () {
        if (config.callbackStorno !== null) {
            config.callbackStorno();
        }
    });

    nodeFolderView.addEventListener('change', function () {
        folderView = nodeFolderView.value;
        refreshFiles();
    });

    nodeFilter.addEventListener('keyup', function () {
        this.value = this.value.toLowerCase();
        filterFile = this.value;
        refreshFiles();
    });


    Array.prototype.forEach.call(document.querySelectorAll('button[data-action-closepanel]'), function (el) {
        el.addEventListener('mousedown', function () {
            document.getElementById(this.getAttribute('data-action-closepanel')).classList.add('hidden');
        });
    });

    butMkDir.addEventListener('mousedown', function () {
        panelMkDir.querySelector('input[type="text"]').value = '';
        panelMkDir.classList.remove('hidden');
        // hack for FF and chrome
        setTimeout(function() { panelMkDir.querySelector('input[type="text"]').focus(); }, 0);
    });
    butMkDirSubmit.addEventListener('mousedown', mkDir);

    butDelete.addEventListener('mousedown', function () {
        panelDelete.classList.remove('hidden');
    });
    butDeleteSubmit.addEventListener('mousedown', del);

    butRename.addEventListener('mousedown', function () {
        if (selectedFile === '') {
            return;
        }
        panelRename.classList.remove('hidden');
        // hack for FF and chrome
        setTimeout(function() { panelRename.querySelector('input[type="text"]').focus(); }, 0);
    });
    butRenameSubmit.addEventListener('mousedown', rename);

    butCopy.addEventListener('mousedown', function () {
        if (selectedFile === '') {
            return;
        }
        panelCopy.classList.remove('hidden');
        // hack for FF and chrome
        setTimeout(function() { panelCopy.querySelector('input[type="text"]').focus(); }, 0);
    });
    butCopySubmit.addEventListener('mousedown', copy);

    butUpload.addEventListener('mousedown', function () {
        progressUpload.innerHTML = '';
        var newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.accept = config.uploadAccept;
        newInput.multiple = true;
        newInput.id = 'fldUpload';

        var inputFile = panelUpload.querySelector('[type="file"]');
        inputFile.parentNode.replaceChild(newInput, inputFile);

        newInput.addEventListener('change', function () {
            if (this.files.length) {
                uploadFiles(this.files);
            }
        });

        panelUpload.classList.remove('hidden');
    });

    nodeMsg.querySelector('button').addEventListener('mousedown', function () {
        nodeMsg.querySelector('span').innerHTML === '';
        nodeMsg.classList.add('hidden');
    });

    var uploadFiles = function (files) {
        for (var i = 0; i < files.length; i++) {
            if (config.uploadAccept !== '' && config.uploadAccept.indexOf(files[i].type) === -1) {
                addUploadRow('', files[i].name, files[i].size, '0%', translate('ErrUploadInvalidType'));
                continue;
            }
            if (config.uploadMaxSize !== null && files[i].size > config.uploadMaxSize) {
                addUploadRow('', files[i].name, files[i].size, '0%', translate('ErrUploadInvalidSize'));
                continue;
            }

            var fd = new FormData();
            fd.append('file', files[i]);
            fd.append('config', config.configServer);
            fd.append('action', 'upload');
            fd.append('path', selectedPath);
            var xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('loadstart', handleUploadStart, false);
            // anonymous fuction is quicker than addEventListener with named function
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    var percentComplete = Math.round(e.loaded * 100 / e.total);
                    var uploadProgressElement = document.getElementById(this.uploadId).querySelector('td.progress');
                    uploadProgressElement.innerHTML = percentComplete.toString()  +  '%';
                }
            };

            xhr.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        handleUploadEnd(this);
                    } else {
                        handleUploadError(this);
                    }
                }
            };
            xhr.upload.timeout = 60000;
            xhr.upload.ontimeout = function () {
                handleUploadError(xhr);
            };

            xhr.upload.uploadId = files[i].name  +  ''  + files[i].size;
            xhr.upload.file = files[i];

            xhr.open('POST', config.connector, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('Cache-Control','no-cache');
            xhr.setRequestHeader('Connection', 'close');
            xhr.send(fd);
        }
    };

    var handleUploadStart = function () {
        addUploadRow(this.uploadId, this.file.name, this.file.size, '0%', '');
    };

    var addUploadRow = function (rowId, fileName, fileSize, progress, result) {
        var row = progressUpload.insertRow(0);
        row.id = rowId;
        var cell1 = row.insertCell(0);
        cell1.innerHTML = fileName;
        var cell2 = row.insertCell(1);
        cell2.innerHTML = formatFilesize(fileSize);
        var cell3 = row.insertCell(2);
        cell3.innerHTML = progress;
        cell3.className = 'progress';
        var cell4 = row.insertCell(3);
        cell4.className = 'result';
        cell4.innerHTML = result;
    };

    var handleUploadEnd = function (xhr) {
        try {
            var data = JSON.parse(xhr.responseText);
        } catch(e) {
             handleUploadError(xhr, 'ErrUpload');
             return;
        }

        if (data.status === 'OK') {
            var uploadProgressElement = document.getElementById(xhr.upload.uploadId).querySelector('td.progress');
            uploadProgressElement.innerHTML = '100%';
            var uploadStatus = document.getElementById(xhr.upload.uploadId).querySelector('td.result');
            uploadStatus.innerHTML = 'OK';
            files = data.files;
            refreshFiles();
            return;
        }
        handleUploadError(xhr, translate('ServerErrorCode' + data.err));
    };

    var handleUploadError = function (xhr, customMsg) {
        var uploadStatus = document.getElementById(xhr.upload.uploadId).querySelector('td.result');
        uploadStatus.classList.add('error');
        uploadStatus.innerHTML = translate(typeof customMsg === 'undefined' ? xhr.statusText : customMsg);
    };

    // drag drop upload in folder
    nodeFolder.ondragover = function (e) {
        e.preventDefault();
        return false;
    };

    nodeFolder.addEventListener('drop', function (event) {
        event.preventDefault();
        if (event.dataTransfer.files.lenth > 0) {
            panelUpload.classList.remove('hidden');
            uploadFiles(event.dataTransfer.files);
        }
    });

    // initialization
    if (config.callbackInit !== null) {
        config.callbackInit();
    }
    translatePage();
    setFile('');
    loadTree();
};
