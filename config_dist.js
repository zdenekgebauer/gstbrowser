'use strict';

var GstBrowser = GstBrowser || {};

GstBrowser.Config = {
    default: {
        /** url to server connector */
        connector: 'http://localhost/filebrowser-php/index.php',
        /** base url to root folder with files, relative or absolute without trailing slash */
        baseUrl: window.location.protocol + '//' + window.location.host,
        /** parameter 'config' passed to server */
        configServer: 'default',
        /** language file */
        lang: 'cs',
        /** filetypes accepted for upload  */
        uploadAccept: '',
        /** max size of file for upload (in bytes) */
        uploadMaxSize: null,
        /**
         * function called when filebrowser is initialized
         */
        callbackInit: function () {},
        /**
         * function pass url of selected file back to editor
         * @param {String} url of selected file
         */
        callbackSubmit: function (url) { alert(url); },
        /**
         * function called when filebrowser is closed by button storno
         */
        callbackStorno: function () { alert('storno'); }
    }
};