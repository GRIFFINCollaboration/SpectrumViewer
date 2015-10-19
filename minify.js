// setup:
// 1. install node: https://nodejs.org/en/
// 2. npm install node-minify
// 3. node minify.js

var compressor = require('node-minify');

new compressor.minify({
    type: 'uglifyjs',
    fileIn: [
        'scripts/mustache.js', 
        'scripts/ultralight.js', 
        'scripts/easeljs-0.7.0.min.js',
        'scripts/dygraphs.1.1.1.min.js',
        'scripts/gammaSpectrum.js',
        'scripts/rateMonitor.js',
        'scripts/helpers.js',
        'scripts/plotSpectraHelpers.js' 
    ],
    fileOut: 'scripts/rateMonitor.min.js',
    callback: function(err, min){
        console.log(err);
        //console.log(min); 
    }
});