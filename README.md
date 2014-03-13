# GST Browser

GST Browser is filemanager for TinymCE, CKEditor and web apps. This is only client part, full integration require
server connector for php https://github.com/zdenekgebauer/gstbrowser-connector-php or python
https://github.com/zdenekgebauer/gstbrowser-connector-python

## Instalation

## Manual instalation
1. Make a clean directory, this directory must be accessible via url.
2. Download zip with latest version from github file and unpack its contents to the same directory.

Or you can clone repository to the same directory.

## Instalation via bower
Add to bower.json
"dependencies": {
    "gstbrowser": "git://github.com/zdenekgebauer/gstbrowser.git"
}
then
bower install

## Configuration
Rename config_dist.js to config.js and adjust the settings according to your needs. You should set up at least
section 'default', this section will be used if you don't pass parameter config in url. You can create more sections
with different configurations - see directory demo and file config_demo.js. Directory demo contains example
how to set gstbrowser for TinymCE, CKEditor or how to open browser in new window or new iframe.

## Localization
If you missing your language, then you can create a file language_code.js in directory js/lang, where language_code is
code of your language by ISO 639-1 (http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) See cs.js for czech language
as example. Then place setting 'lang': 'language_code' in appropriate section in config.js.

## Styling
If you need different design of browser, you can create copy of css/default.css and change setting
'css': 'path/to/your.css' in appropriate section in config.js.






