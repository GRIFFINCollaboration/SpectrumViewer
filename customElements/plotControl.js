xtag.register('x-plot-control-v', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('plotControlVertical').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {
                        'waveformSnap': dataStore.waveformSnap,
                        'doUpdates': dataStore.doUpdates
                    });
                }.bind(this)
            )

            //listen for plot requests
            this.addEventListener('requestPlot', this.routeNewPlot, false);

            //keep a list of canvases to point at
            this.targets = dataStore.plots;

            //keep a list of spectra to poll
            this.activeSpectra = [];
        }
    },

    methods:{
        configure: function(){
            
        },

        routeNewPlot: function(event){
            //catch a requestPlot event, do appropriate things with it.
            var i;

            //update list of spectra to poll
            if(this.activeSpectra.indexOf(event.detail.plotName) == -1)
                this.activeSpectra.push(event.detail.plotName);

            //add a dummy spectrum with the requested name to all active plots
            for(i=0; i<this.targets.length; i++)
                dataStore.viewers[this.targets[i]].addData(event.detail.plotName, [0]);

            //demand refresh
            this.refreshAll()
        },

        refreshAll: function(){
            //refresh all spectra

            var queries = constructQueries(this.activeSpectra);

            Promise.all(queries.map(promiseJSONURL)
                ).then(
                    function(spectra){
                        var i, j, key, viewerKey;

                        for(i=0; i<spectra.length; i++){
                            for(key in spectra[i]){
                                //repopulate all spectra that use this spectrum
                                for(viewerKey in dataStore.viewers){
                                    if(dataStore.viewers[viewerKey].plotBuffer[key]){
                                        dataStore.viewers[viewerKey].addData(key, spectra[i][key]);
                                        dataStore.viewers[viewerKey].plotData();
                                    }
                                }
                            }
                        }
                    }
                )/*.then(
                    dataStore.ODBrequests.map(promiseScript)
                ).then(
                    function(){
                    if(typeof fetchCallback === "function"){
                        fetchCallback();
                    }
                })*/
        }





    }

});

/////////////
// helpers
/////////////

function constructQueries(keys){
    //takes a list of plot names and produces the query string needed to fetch them, in an array
    //more than 32 requests will be split into separate queries.

    var i, j, queryString, queries = [];
    for(i=0; i<Math.ceil(keys.length/32); i++){
        queryString = dataStore.spectrumServer + '?cmd=callspechandler';
        for(j=i*32; j<Math.min( (i+1)*32, keys.length ); j++){
            queryString += '&spectrum' + j + '=' + keys[j];
        }
        queries.push(queryString);
    }

    return queries
}

function promiseJSONURL(url){
    // promise to get response from <url> 
    //thanks http://www.html5rocks.com/en/tutorials/es6/promises/

    // Return a new promise.
    return new Promise(function(resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open('GET', url);

        req.onload = function() {
            // This is called even on 404 etc
            // so check the status
            if (req.status == 200) {
                // Resolve the promise with the response text parsed as JSON
                resolve(JSON.parse(req.response.replace(/\'/g, '\"')));  //good grief fix this in the server
            }
            else {
                // Otherwise reject with the status text
                // which will hopefully be a meaningful error
                reject(Error(req.statusText));
            }
        };

        // Handle network errors
        req.onerror = function() {
            reject(Error("Network Error"));
        };

        // Make the request
        req.send();
    });
}
