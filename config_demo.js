'use strict';

var GstBrowser = GstBrowser || {};

GstBrowser.Config = {
    demo_tinymce3: {
        connector: 'http://localhost/filebrowser-php/index.php',
        configServer: 'demo',
        callbackInit: function () {
            // tinymce3 require tiny_mce_popup.js included in filebrowser
            var script = document.createElement('script');
            script.src = 'demo/tinymce3/tiny_mce_popup.js';
            document.getElementsByTagName('head')[0].appendChild(script);
        },
        callbackSubmit: function (url) {
            var win = tinyMCEPopup.getWindowArg('window');
            win.document.getElementById(tinyMCEPopup.getWindowArg('input')).value = url;
            if (typeof win.ImageDialog !== 'undefined') {
                if (win.ImageDialog.getImageData) {
                    win.ImageDialog.getImageData();
                }
                if (win.ImageDialog.showPreviewImage) {
                    win.ImageDialog.showPreviewImage(url);
                }
            }
            tinyMCEPopup.close();
        },
        callbackStorno: function () {
            tinyMCEPopup.close();
        }
    },
    demo_tinymce4: {
        connector: 'http://localhost/filebrowser-php/index.php',
        configServer: 'demo',
        callbackSubmit: function (url) {
            var dialogArguments = top.tinymce.activeEditor.windowManager.getParams();
            dialogArguments.window.document.getElementById(dialogArguments.input).value = url;
            top.tinymce.activeEditor.windowManager.close();
        },
        callbackStorno: function () {
            top.tinymce.activeEditor.windowManager.close();
        }
    },
    demo_ckeditor: {
        connector: 'http://localhost/filebrowser-php/index.php',
        configServer: 'demo',
        callbackSubmit: function (url) {
            // ckeditor append variable CKEditorFuncNum in url to filebrowser
            var oRegex = new RegExp('[\?&]CKEditorFuncNum=([^&]+)', 'i');
            var oMatch = oRegex.exec(window.top.location.search);
            var CKEditorFuncNum = (oMatch && oMatch.length > 1 ? decodeURIComponent(oMatch[1]) : 1);
            window.opener.CKEDITOR.tools.callFunction(CKEditorFuncNum, url);
            window.close();
        },
        callbackStorno: function () {
            window.close();
        }
    },
    demo_window: {
        connector: 'http://localhost/filebrowser-php/index.php',
        configServer: 'demo',
        callbackSubmit: function (url) {
            window.opener.document.getElementById('selectedFile').innerHTML = url;
            window.close();
        },
        callbackStorno: function () {
            window.close();
        }
    },
    demo_iframe: {
        connector: 'http://localhost/filebrowser-php/index.php',
        configServer: 'demo',
        callbackSubmit: function (url) {
            parent.document.getElementById('selectedFile2').innerHTML = url;
            parent.document.getElementById('browseriframe').style.display = 'none';
        },
        callbackStorno: function () {
            parent.document.getElementById('browseriframe').style.display = 'none';
        }
    }
};