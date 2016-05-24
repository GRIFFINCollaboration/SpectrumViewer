function plotControl(wrapperID, config){

    this.wrapID = wrapperID;
    this.wrap = document.getElementById(wrapperID);
    this.config = config;

    this.setup = function(){

        var temp;
        var i, j, linY, logY;

        if(this.config == 'vertical')
            temp = 'plotControlVertical';
        else if(this.config == 'horizontal')
            temp = 'plotControlHorizontal';
        //inject template
        this.wrap.innerHTML = Mustache.to_html(
            dataStore.templates[temp], 
            {
                'id': this.wrapID,
                'waveformSnap': dataStore.waveformSnap,
                'doUpdates': dataStore.doUpdates
            }
        )

        //listen for plot requests
        this.wrap.addEventListener('requestPlot', this.routeNewPlot.bind(this), false);

        //listen for cell attach / unattach events
        this.wrap.addEventListener('attachCell', this.attachCell.bind(this), false);

        //listen for newCell events (attach them automatically)
        this.wrap.addEventListener('newCell', this.setupNewCell.bind(this), false);

        //listen for deleteCell events
        this.wrap.addEventListener('deleteCell', this.deleteCell.bind(this), false);

        //keep a list of canvases to point at
        this.targets = JSON.parse(JSON.stringify(dataStore.plots));

        //keep a list of spectra to poll
        this.activeSpectra = [];


        //UI callbacks:
        //x-range control:
        document.getElementById(this.wrapID+'minX').onchange = this.updateAllXranges.bind(this);
        document.getElementById(this.wrapID+'maxX').onchange = this.updateAllXranges.bind(this);

        //x scroll:
        document.getElementById(this.wrapID+'bigLeft').onclick = this.scrollAllSpectra.bind(this, -100);
        document.getElementById(this.wrapID+'littleLeft').onclick = this.scrollAllSpectra.bind(this, -1);
        document.getElementById(this.wrapID+'littleRight').onclick = this.scrollAllSpectra.bind(this, 1);
        document.getElementById(this.wrapID+'bigRight').onclick = this.scrollAllSpectra.bind(this, 100);

        //prev / next x range buttons
        document.getElementById(this.wrapID+'prev').onclick = this.cycleXlimits.bind(this, -1);
        document.getElementById(this.wrapID+'next').onclick = this.cycleXlimits.bind(this,  1);

        //unzoom button
        document.getElementById(this.wrapID+'unzoom').onclick = this.unzoomAllSpectra.bind(this);

        //plug in the waveform snap buttion
        if(dataStore.waveformSnap)
            document.getElementById(this.wrapID+'snapWaveform').onclick = this.snapAll.bind(this);

        //lin-log toggle
        linY = document.getElementById(this.wrapID+'linearY');
        logY = document.getElementById(this.wrapID+'logY');
        linY.onclick = this.setAllAxes.bind(this, 'linear');
        logY.onclick = this.setAllAxes.bind(this, 'log');

        //data refresh - note all plots live on the same refresh cycle.
        if(document.getElementById(this.wrapID+'updateWrap')){
            //update interval select
            document.getElementById(this.wrapID+'upOptions').onchange = this.startRefreshLoop.bind(document.getElementById(this.wrapID+'upOptions'), this);
            //update now button
            document.getElementById(this.wrapID+'upNow').onclick = this.refreshAll.bind(this);

            //set the refresh loop going
            this.startRefreshLoop.bind(document.getElementById(this.wrapID+'upOptions'), this)();
        }

    }

    /////////////////////
    // data routing
    /////////////////////

    this.routeNewPlot = function(event){
        //catch a requestPlot event, do appropriate things with it.
        //<event>: event; requestPlot custom event
        //this: plotControl object
        var i, evt;

        //update list of spectra to poll
        if(this.activeSpectra.indexOf(event.detail.plotName) == -1)
            this.activeSpectra.push(event.detail.plotName);

        for(i=0; i<this.targets.length; i++){

            //if new, send an event to the auxilary control table so it can update iteself
            if(!dataStore.viewers[this.targets[i]].plotBuffer[event.detail.plotName]){

                //add data now so row adder can find its color assignment
                dataStore.viewers[this.targets[i]].addData(event.detail.plotName, [0]);

                dispatcher(
                    { 
                        'plotName': event.detail.plotName,
                        'target': this.targets[i] 
                    }, 
                    dataStore.addPlotRowListeners, 
                    'addPlotRow'
                )
              
            } else {
                //add a dummy spectrum to all active plots
                dataStore.viewers[this.targets[i]].addData(event.detail.plotName, [0]);
            }
        }

        //demand refresh
        this.refreshAll()
    }

    this.refreshAll = function(){
        //refresh all spectra & odb parameters
        //this: plotControl object

        var queries = constructQueries(this.activeSpectra);

        Promise.all(queries.map(promiseJSONURL)
            ).then(
                function(spectra){
                    var i, j, key, viewerKey;
                    dataStore.rawData = {};

                    for(i=0; i<spectra.length; i++){
                        for(key in spectra[i]){
                            //keep the raw results around
                            dataStore.rawData[key] = JSON.parse(JSON.stringify(spectra[i][key]));
                            //repopulate all spectra that use this spectrum
                            for(viewerKey in dataStore.viewers){
                                if(dataStore.viewers[viewerKey].plotBuffer[key]){
                                    dataStore.viewers[viewerKey].addData(key, spectra[i][key]);
                                }
                            }
                        }
                    }
                }
            ).then(
                dataStore.ODBrequests.map(promiseScript)
            ).then(
                function(){
                    if(typeof fetchCallback === "function"){
                        fetchCallback();
                    }
            })
    }

    this.startRefreshLoop = function(controlElement){
        //sets the refresh loop as a callback to changing the selector menu.
        //<controlElement>: plotControl element
        //this: select element (or anything with a .value of time in ms)

        var period = parseInt(this.value,10); //in miliseconds

        clearInterval(dataStore.dataRefreshLoop);
        if(period != -1)
            dataStore.dataRefreshLoop = setInterval(controlElement.refreshAll.bind(controlElement), period );

    }

    this.setupNewCell = function(event){
        // response to a newCell event: plug in interaction callbacks and attach the cell by default

        this.configureCell(event.detail.cellName);
        this.attachCell();
    }

    this.configureCell = function(id){
        //per plot control configuration
        //<id>: string; plot label from dataStore.plots
        //this: plotControl object

        //plug in cursor reporting
        dataStore.viewers[id].mouseMoveCallback = this.cursorReporting.bind(this);

        //send plot limit changes back to the control panel
        dataStore.viewers[id].chooseLimitsCallback = this.updateRangeSelector.bind(this, id)
    }

    this.attachCell = function(event){
        //update the list of plot cells attached to the control
        //<event>: event; attachCell custom event
        //this: plotControl object

        var i, 
            activeToggles = document.getElementsByClassName('activeWindowFlag');

        this.targets = []

        for(i=0; i<activeToggles.length; i++){
            if(activeToggles[i].checked){
                this.targets.push(activeToggles[i].value)
            }
        }

    }

    this.deleteCell = function(event){
        //respond to a deleteCell event
        //<event>: event; deleteCell custom event
        //this: plotControl object

        var index = this.targets.indexOf(event.detail.cellName);
        if(index != -1)
            this.targets.splice(index);

    }

    //////////////////
    // misc
    //////////////////

    this.cursorReporting = function(x,y){
        //report cursor positions
        //<x>: number; bin number under cursor
        //<y>: number; counts position under cursor
        //this: plotControl object

        var X = '-', Y = '-';

        if(typeof x == 'number' && !isNaN(x) )
            X = x>10000? x.toExponential(3) : x;
        if(typeof y == 'number' && !isNaN(y) )
            Y = y>10000? y.toExponential(3) : y;

        document.getElementById(this.wrapID + 'cursorReport').innerHTML = 'Cursor: x: ' + X + ' y: ' + Y
    }

    /////////////////////////////
    // x-range management
    /////////////////////////////

    this.updateAllXranges = function(){
        //update the x-ranges of all active plots based on the text box inputs
        //this: plotControl object
        var i;

        for(i=0; i<this.targets.length; i++){
            this.updatePlotRange(this.targets[i]);
        }
    }

    this.updatePlotRange = function(plot){
        //update the plot ranges for the named plot onchange of the x-range input fields
        //<plot>: string; name of plot to update, from dataStore.plots
        //this: plotControl object
        var xMin = document.getElementById(this.wrapID + 'minX'),
            xMax = document.getElementById(this.wrapID + 'maxX');

        var x0 = parseInt(xMin.value,10);
        var x1 = parseInt(xMax.value,10);

        if(this.manageXvalidity()){

            dataStore.viewers[plot].XaxisLimitMin = x0;
            dataStore.viewers[plot].XaxisLimitMax = x1;

            dataStore.viewers[plot].plotData();
        }
    }

    this.updateRangeSelector = function(plot){
        //update the UI when the plot is zoomed with the mouse
        //<plot>: string; name of plot to update, from dataStore.plots
        //this: plotControl object
        
        var xMin = dataStore.viewers[plot].XaxisLimitMin,
            xMax = dataStore.viewers[plot].XaxisLimitMax

        if(document.activeElement.id != this.wrapID + 'minX')
            document.getElementById(this.wrapID + 'minX').value = xMin;
        if(document.activeElement.id != this.wrapID + 'maxX')
            document.getElementById(this.wrapID + 'maxX').value = xMax;

        this.manageXvalidity();
    }

    this.manageXvalidity = function(){
        //check that x min < x max, and complain otherwise.
        //this: plotControl object

        var xMin = document.getElementById(this.wrapID + 'minX'),
            xMax = document.getElementById(this.wrapID + 'maxX');

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
    }

    this.scrollAllSpectra = function(scrollDistance){
        //scroll the x-ranges of all active plots based via the scroll buttons
        //<scrollDistance>: number; bins to scroll to the right
        //this: plotControl object
        var i;

        for(i=0; i<this.targets.length; i++){
            dataStore.viewers[this.targets[i]].scrollSpectra.bind(dataStore.viewers[this.targets[i]], scrollDistance)();
        }
    }

    this.unzoomAllSpectra = function(){
        //unzoom the x-ranges of all active plots based via the scroll buttons
        //this: plotControl object
        var i;

        for(i=0; i<this.targets.length; i++){
            dataStore.viewers[this.targets[i]].unzoom.bind(dataStore.viewers[this.targets[i]])();
        }            
    }

    this.cycleXlimits = function(step){
        //<step>: number; how many steps to take forward in xrange history
        //this: plotControl object
        var i;
        for(i=0; i<this.targets.length; i++){
            dataStore.viewers[this.targets[i]].restoreLimits.bind(dataStore.viewers[this.targets[i]], step)();
        } 

    }

    /////////////////////
    // y axis control
    /////////////////////

    this.snapAll = function(){
        //snap all active spectra to waveform lock mode
        //this: plotControl object
        var i;

        for(i=0; i<this.targets.length; i++){
            this.waveformSnap(this.targets[i]);
        }  
    }
    
    this.waveformSnap = function(plot){
        //toggle the snap to waveform state on the requested plot
        //<plot>: string; name of plot to update, from dataStore.plots
        //this: plotControl object

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
    }

    this.setAllAxes = function(state){
        //set the y axis state of every active plot
        //<state>: string; 'linear' or 'log'. 
        //this: plotControl object
        
        var i;

        for(i=0; i<this.targets.length; i++){
            dataStore.viewers[this.targets[i]].setAxisType(state);                
        } 
    }
}









