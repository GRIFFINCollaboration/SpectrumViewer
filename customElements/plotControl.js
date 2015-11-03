xtag.register('x-plot-control-v', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('plotControlVertical').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {
                        'id': this.id,
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
        /////////////////////////
        // configuration
        /////////////////////////
        configure: function(){

            var i, j, linY, logY;

            //UI callbacks:
            //x-range control:
            document.getElementById(this.id+'minX').onchange = this.updateAllXranges.bind(this);
            document.getElementById(this.id+'maxX').onchange = this.updateAllXranges.bind(this);

            //x scroll:
            document.getElementById(this.id+'bigLeft').onclick = this.scrollAllSpectra.bind(this, -100);
            document.getElementById(this.id+'littleLeft').onclick = this.scrollAllSpectra.bind(this, -1);
            document.getElementById(this.id+'littleRight').onclick = this.scrollAllSpectra.bind(this, 1);
            document.getElementById(this.id+'bigRight').onclick = this.scrollAllSpectra.bind(this, 100);

            //unzoom button
            document.getElementById(this.id+'unzoom').onclick = this.unzoomAllSpectra.bind(this);

            //plug in the waveform snap buttion
            document.getElementById(this.id+'snapWaveform').onclick = this.snapAll.bind(this);

            //lin-log toggle
            linY = document.getElementById(this.id+'linearY');
            logY = document.getElementById(this.id+'logY');
            linY.onclick = this.setAllAxes.bind(this, 'linear');
            logY.onclick = this.setAllAxes.bind(this, 'log');

            //plug in controls for each plot
            for(i=0; i<this.targets.length; i++){
                this.configureSinglePlot(dataStore.plots[i]);
            }

            //data refresh - note all plots live on the same refresh cycle.
            if(document.getElementById(this.id+'updateWrap')){
                //update interval select
                document.getElementById(this.id+'upOptions').onchange = this.startRefreshLoop.bind(document.getElementById(this.id+'upOptions'), this);
                //update now button
                document.getElementById(this.id+'upNow').onclick = this.refreshAll.bind(this);

                //set the refresh loop going
                this.startRefreshLoop.bind(document.getElementById(this.id+'upOptions'), this)();
            }
            
        },

        configureSinglePlot: function(id){
            //per plot control configuration

            //plug in cursor reporting
            dataStore.viewers[id].mouseMoveCallback = this.cursorReporting.bind(this);

            //send plot limit changes back to the control panel
            dataStore.viewers[id].chooseLimitsCallback = this.updateRangeSelector.bind(this, id)
        },

        /////////////////////
        // data routing
        /////////////////////

        routeNewPlot: function(event){
            //catch a requestPlot event, do appropriate things with it.
            var i;

            //update list of spectra to poll
            if(this.activeSpectra.indexOf(event.detail.plotName) == -1)
                this.activeSpectra.push(event.detail.plotName);

            for(i=0; i<this.targets.length; i++){

                //if new, send an event to the auxilary control table so it can update iteself
                if(!dataStore.viewers[this.targets[i]].plotBuffer[event.detail.plotName]){

                    //add data now so row adder can find its color assignment
                    dataStore.viewers[this.targets[i]].addData(event.detail.plotName, [0]);

                    evt = new CustomEvent('addPlotRow', {detail: 
                        { 
                            'plotName': event.detail.plotName,
                            'target': this.targets[i] 
                        }
                    });

                    dataStore.addPlotRowListeners.map(function(id){
                        document.getElementById(id).dispatchEvent(evt);
                    })                    
                } else {
                    //add a dummy spectrum to all active plots
                    dataStore.viewers[this.targets[i]].addData(event.detail.plotName, [0]);
                }
            }

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
        },

        startRefreshLoop: function(controlElement){
            //sets the refresh loop as a callback to changing the selector menu.
            //control element == the plot control dom element (this object)

            var period = parseInt(this.value,10); //in miliseconds

            clearInterval(dataStore.dataRefreshLoop);
            if(period != -1)
                dataStore.dataRefreshLoop = setInterval(controlElement.refreshAll.bind(controlElement), period );

        },

        //////////////////
        // misc
        //////////////////

        cursorReporting: function(x,y){
            //report cursor positions

            var X = '-', Y = '-';

            if(typeof x == 'number' && !isNaN(x) )
                X = x;
            if(typeof y == 'number' && !isNaN(y) )
                Y = y;
            document.getElementById(this.id + 'cursorReport').innerHTML = 'x: ' + X + ' y: ' + Y
        },

        /////////////////////////////
        // x-range management
        /////////////////////////////

        updateAllXranges: function(){
            //update the x-ranges of all active plots based on the text box inputs
            var i;

            for(i=0; i<this.targets.length; i++){
                this.updatePlotRange(this.targets[i]);
            }
        },

        updatePlotRange: function(plot){
            //update the plot ranges for the named plot onchange of the x-range input fields
            var xMin = document.getElementById(this.id + 'minX'),
                xMax = document.getElementById(this.id + 'maxX');

            var x0 = parseInt(xMin.value,10);
            var x1 = parseInt(xMax.value,10);

            if(this.manageXvalidity()){

                dataStore.viewers[plot].XaxisLimitMin = x0;
                dataStore.viewers[plot].XaxisLimitMax = x1;

                dataStore.viewers[plot].plotData();
            }
        },

        updateRangeSelector: function(plot){
            //update the UI when the plot is zoomed with the mouse
            var xMin = dataStore.viewers[plot].XaxisLimitMin,
                xMax = dataStore.viewers[plot].XaxisLimitMax

            if(document.activeElement.id != this.id + 'minX')
                document.getElementById(this.id + 'minX').value = xMin;
            if(document.activeElement.id != this.id + 'maxX')
                document.getElementById(this.id + 'maxX').value = xMax;

            this.manageXvalidity();
        },

        manageXvalidity: function(){
            //check that x min < x max, and complain otherwise.

            var xMin = document.getElementById(this.id + 'minX'),
                xMax = document.getElementById(this.id + 'maxX');

            var x0 = parseInt(xMin.value,10);
            var x1 = parseInt(xMax.value,10);

            if(x1 <= x0){
                xMin.setCustomValidity("minimum value of x must be less than maximum value of x.");
                xMax.setCustomValidity("minimum value of x must be less than maximum value of x.");
                return false
            }

            xMin.setCustomValidity("");
            xMax.setCustomValidity("");

            return true
        },

        scrollAllSpectra: function(scrollDistance){
            //scroll the x-ranges of all active plots based via the scroll buttons
            var i;

            for(i=0; i<this.targets.length; i++){
                dataStore.viewers[this.targets[i]].scrollSpectra.bind(dataStore.viewers[this.targets[i]], scrollDistance)();
            }
        },

        unzoomAllSpectra: function(){
            //unzoom the x-ranges of all active plots based via the scroll buttons
            var i;

            for(i=0; i<this.targets.length; i++){
                dataStore.viewers[this.targets[i]].unzoom.bind(dataStore.viewers[this.targets[i]])();
            }            
        },

        /////////////////////
        // y axis control
        /////////////////////

        snapAll: function(){
            //snap all active spectra to waveform lock mode
            var i;

            for(i=0; i<this.targets.length; i++){
                this.waveformSnap(this.targets[i]);
            }  
        },
        
        waveformSnap: function(plot){
            //toggle the snap to waveform state on the requested plot
            if(dataStore.viewers[plot].waveformLock){
                dataStore.viewers[plot].demandXmin = null;
                dataStore.viewers[plot].demandXmax = null;
                dataStore.viewers[plot].demandYmin = null;
                dataStore.viewers[plot].demandYmax = null;
                dataStore.viewers[plot].chooseLimitsCallback = this.updateRangeSelector.bind(this, plot);
                dataStore.viewers[plot].yAxisTitle = 'Counts';
                dataStore.viewers[plot].unzoom();
                dataStore.viewers[plot].waveformLock = 0;
            } else {
                dataStore.viewers[plot].demandXmin = 0;
                dataStore.viewers[plot].demandXmax = dataStore.viewers[plot].longestHist()
                dataStore.viewers[plot].demandYmin = Math.max(0, dataStore.viewers[plot].minY - (dataStore.viewers[plot].maxY - dataStore.viewers[plot].minY)*0.1);
                dataStore.viewers[plot].demandYmax = dataStore.viewers[plot].maxY + (dataStore.viewers[plot].maxY - dataStore.viewers[plot].minY)*0.1; 
                dataStore.viewers[plot].chooseLimitsCallback = function(plot){
                    //set some demand values for the y axis and rerun the limit calculation
                    var rerun = dataStore.viewers[plot].demandYmin == null;
                    //keep x updated
                    dataStore.viewers[plot].demandXmin = 0;
                    dataStore.viewers[plot].demandXmax = dataStore.viewers[plot].longestHist()
                    //bracket y around min and max
                    dataStore.viewers[plot].demandYmin = Math.max(0, dataStore.viewers[plot].minY - (dataStore.viewers[plot].maxY - dataStore.viewers[plot].minY)*0.1);
                    dataStore.viewers[plot].demandYmax = dataStore.viewers[plot].maxY + (dataStore.viewers[plot].maxY - dataStore.viewers[plot].minY)*0.1;
                    //fix the limits with these demand values 
                    if(rerun) dataStore.viewers[plot].chooseLimits();
                    dataStore.viewers[plot].demandYmin = null;
                    dataStore.viewers[plot].demandYmax = null;
                }.bind(null, plot);
                dataStore.viewers[plot].yAxisTitle = 'Waveform Level (Snapped)';
                dataStore.viewers[plot].plotData();
                dataStore.viewers[plot].waveformLock = 1;
            }                   
        },

        setAllAxes: function(state){
            //set the y axis state of every active plot
            var i;

            for(i=0; i<this.targets.length; i++){
                dataStore.viewers[this.targets[i]].setAxisType(state);                
            } 
        },





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
