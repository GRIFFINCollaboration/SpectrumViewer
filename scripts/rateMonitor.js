////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    //sets up global variable datastore
    var i, labels = ['time']

    dataStore = {};
    //x-tag config
    dataStore.plots = ['SUM_Singles_Energy'];
    dataStore.attachCellListeners = ['plotControl'];

    dataStore.manualBKG = {};
    dataStore.rateData = [[new Date(),0,0,0,0,0,0,0,0]];
    dataStore.annotations = {};
    dataStore.targetSpectrum = 'SUM_Singles_Energy';
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';
    dataStore.ODBrequests = ['http://grsmid00.triumf.ca:8081/?cmd=jcopy&odb0=/Equipment/Epics/Variables/MSRD&encoding=json-p-nokeys&callback=parseScalars'];
    dataStore.scalars = {
            'PC': 0,
            'LF1': 0,
            'LF2': 0
        }
    dataStore.currentSpectrum = [];
    dataStore.oldSpectrum = [];
    dataStore.currentTime = null;
    dataStore.oldTime = null;
    dataStore.colors = [
        "#AAE66A",
        "#EFB2F0",
        "#40DDF1",
        "#F1CB3C",
        "#FFFFFF",
        "#F22613",
        "#786FBC",
        "#619D48",
        "#AA5FC7",
        "#D35400"
    ]
    dataStore.defaults = {
            'doUpdates': true,
            'gammas':[
                {
                    'title': 'Gate 1',
                    'index': 0,
                    'min': 497,
                    'max': 504,
                    'color': "#AAE66A",
                    'onByDefault': true
                },
                {
                    'title': 'Gate 2',
                    'index': 1,
                    'min': 197,
                    'max': 204,
                    'color': "#EFB2F0",
                    'onByDefault': true
                },
                {
                    'title': 'Gate 3',
                    'index': 2,
                    'min': 0,
                    'max': 0,
                    'color': "#40DDF1",
                    'onByDefault': false
                },
                {
                    'title': 'Gate 4',
                    'index': 3,
                    'min': 0,
                    'max': 0,
                    'color': "#F1CB3C",
                    'onByDefault': false
                },
                {
                    'title': 'Gate 5',
                    'index': 4,
                    'min': 0,
                    'max': 0,
                    'color': "#FFFFFF",
                    'onByDefault': false
                }  
            ],

            'levels':[
                {
                    'title': 'Proton Current',  //label
                    'id': 'PC'                  //target plot identifier
                },
                {
                    'title': 'Laser Freq. 1',
                    'id': 'LF1'
                },
                {
                    'title': 'Laser Freq. 2',
                    'id': 'LF2'
                }
            ]
        }

    //dygraph
    //construct plot labels
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        labels.push(dataStore.defaults.gammas[i].title);
    }
    for(i=0; i<dataStore.defaults.levels.length; i++){
        labels.push(dataStore.defaults.levels[i].title)
    }

    dataStore.plotStyle = {   
        labels: labels,
        title: 'Gate Integrals for ' + dataStore.targetSpectrum,
        //height: document.getElementById(dataStore.plots[0]).offsetHeight - dataStore.viewer.bottomMargin + 20,
        //width: document.getElementById(dataStore.plots[0]).offsetWidth,
        colors: dataStore.colors,
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                }
            }
        },
        labelsDiv: 'ratesLegend',
        legend: 'always'
    };
    dataStore.plotInitData = [[new Date(),0,0,0,0,0,0,0,0]];
}
setupDataStore();


















function dataSetup(data){
    //define data for templates
    return dataStore.defaults
}

function pageLoad(){
    //runs after ultralight is finished setting up the page.
    var i, node, gammaWindowToggles, gammaWindowEdges, snapGammaButtons, levelToggles;

    //set up gamma spectrum
    createFigure();
    //plug in plot control callbacks:
    setupFigureControl();

    //prepare initial gamma windows
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        drawWindow(i, dataStore.defaults.gammas[i].min, dataStore.defaults.gammas[i].max);
    }

    //plot the spectrum of interest
    dataStore.viewer.addData(dataStore.targetSpectrum, []);
    refreshPlots();

    //set up Dygraph
    createRateMonitor();

    //UI bindings
    gammaWindowToggles = document.getElementsByClassName('gammaToggle')
    for(i=0; i<gammaWindowToggles.length; i++){
        gammaWindowToggles[i].onclick = toggleGammaWindow.bind(null, i);
    }
    gammaWindowEdges = document.getElementsByClassName('gammaEdge')
    for(i=0; i<gammaWindowEdges.length; i++){
        gammaWindowEdges[i].onchange = moveGammaWindow;
    }
    snapGammaButtons = document.getElementsByClassName('snapGateToWindow')
    for(i=0; i<snapGammaButtons.length; i++){
        snapGammaButtons[i].onclick = snapGateToWindow;
    }
    levelToggles = document.getElementsByClassName('levelToggles')
    for(i=0; i<levelToggles.length; i++){
        levelToggles[i].onchange = toggleDygraph.bind(levelToggles[i], i + dataStore.defaults.gammas.length);
    }
    fitOptions = document.getElementsByClassName('fitOptions')
    for(i=0; i<fitOptions.length; i++){
        fitOptions[i].onchange = changeFitMethod;
    }
    fitRanges = document.getElementsByClassName('manualBKG')
    for(i=0; i<fitRanges.length; i++){
        fitRanges[i].onchange = updateManualFitRange;
    }
    document.getElementById('windowSlider').onchange = updateDygraph;
    document.getElementById('windowSlider').oninput = windowSliderCallback;
    document.getElementById('leadingEdgeSlider').oninput = leadingEdgeSliderCallback;

    //manage which gamma window are on by defualt
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        if(!dataStore.defaults.gammas[i].onByDefault)
            document.getElementById('display' + dataStore.defaults.gammas[i].index).click()
    }

    //start periodic refresh
    document.getElementById('upOptions').value = 3000;
    document.getElementById('upOptions').onchange();
    //don't allow refresh period to change
    node = document.getElementById("updateWrap");
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }

}

////////////////////
// Data Handling
////////////////////

function fetchCallback(){
    //runs as callback after all data has been refreshed.

    var sumOld, sumNew;
    //keep track of this histogram and the last one for calculating rates:
    if(dataStore.currentSpectrum){
        sumOld = dataStore.oldSpectrum.integrate(0,100);
        dataStore.oldSpectrum = JSON.parse(JSON.stringify(dataStore.currentSpectrum));
    }
    dataStore.currentSpectrum = JSON.parse(JSON.stringify(dataStore.viewer.plotBuffer[dataStore.targetSpectrum]));
    sumNew = dataStore.currentSpectrum.integrate(0,100);

    //note that at run start, the oldSpectrum will still have the stale state of the spectrum in it from last run,
    //since the analyzer keeps broadcasting it; need to detect when the spectrum has been zeroed and also skip here.
    if(sumNew < sumOld)
        dataStore.oldSpectrum = [];

    dataStore.oldTime = dataStore.currentTime;
    dataStore.currentTime = Date.now()/1000;

    //update the rate monitor and backgrounds fits
    appendNewPoint();
    //redraw spectrum, fit results included
    dataStore.viewer.plotData();
}

function appendNewPoint(){
    //integrate gamma windows and append result as new point on rate monitor.
    var i, j, id, min, max, gates = [], levels = [], bkgTechnique, bkgSample, bkgPattern, bkg, y0, y1, bkgColor;

    dataStore.viewer.binHighlights = [];
    //subtract backgrounds from gates in new histogram if asked.
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        id = dataStore.defaults.gammas[i].index;
        min = dataStore.viewer.verticals['min' + id].bin
        max = dataStore.viewer.verticals['max' + id].bin

        //attempt to fit & subtract background
        bkgTechnique = document.querySelector('input[name="bkg'+id+'"]:checked').value;
        dataStore.viewer.removeLine('bkg'+id);
        if(min!=max && bkgTechnique != 'off'){
            bkgPattern = dataStore.manualBKG['bins'+id];
            bkgSample = [[],[]];
            if(bkgTechnique=='auto'){
                bkgSample = constructAutoBackgroundRange(min, max);
            } else if(bkgTechnique=='manual' && bkgPattern ){ //ie only even try to do this if a valid bkgPattern has made it into the dataStore.
                bkgSample = constructManualBackgroundRange(bkgPattern, dataStore.viewer.plotBuffer[dataStore.currentSpectrum]);
            }

            //highlight selected background bins
            bkgColor = fadeHexColor(dataStore.colors[i], 0.2);
            for(j=0; j<bkgSample[0].length; j++){
                dataStore.viewer.binHighlights[bkgSample[0][j]] = {
                    'color': bkgColor,
                    'height': bkgSample[1][j]
                }
            }

            //fit background
            bkg = dataStore.viewer.linearBKG.apply(null, bkgSample);

            //update annotation with fit line
            y0 = bkg[0] + (min-1)*bkg[1];
            y1 = bkg[0] + max*bkg[1];
            dataStore.viewer.addLine('bkg'+id, min-1, y0, max, y1, dataStore.colors[i]);

            //subtract the fit background
            if(!isNaN(bkg[0]) && !isNaN(bkg[1]) ){
                for(j=min; j<max; j++){
                    this.dataStore.currentSpectrum[j] -= bkg[0] + j*bkg[1];
                }
            }
        }
    }

    //can't continue until two histograms have been collected;
    if(dataStore.oldSpectrum.length == 0)
        return;

    //calculate change from last collection to this one
    dataStore.histoDiff = subtractHistograms(dataStore.oldSpectrum, dataStore.currentSpectrum);

    //integrate gamma window on difference histogram
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        id = dataStore.defaults.gammas[i].index;
        min = dataStore.viewer.verticals['min' + id].bin
        max = dataStore.viewer.verticals['max' + id].bin

        gates[i] = 0;
        for(j=min; j<max; j++){
            gates[i] += dataStore.histoDiff[j];
        }
        gates[i] /= (dataStore.currentTime - dataStore.oldTime);        
    }
    
    //add on levels data
    for(i=0; i<dataStore.defaults.levels.length; i++){
        levels.push( dataStore.scalars[dataStore.defaults.levels[i].id] );
    }

    //update data history
    dataStore.rateData.push( [new Date()].concat(gates).concat(levels) );

    //update plot
    updateDygraph();

}

////////////////////
// UI Callbacks
////////////////////

function updateManualFitRange(){
    //callback to register a manual fit range
    var index = parseInt(this.id.slice(4),10);
    var bkgTechnique = document.querySelector('input[name="bkg'+index+'"]:checked').value;

    if(this.checkValidity()){
        dataStore.manualBKG[this.id] = this.value
        if(bkgTechnique == 'manual')
            queueAnnotation(dataStore.defaults.gammas[index].title, 'Manual BKG bins updated to ' + this.value)
    }
}

function changeFitMethod(){
    //callback after changing the fit method radio
    var index = parseInt(this.name.slice(3),10);
    queueAnnotation(dataStore.defaults.gammas[index].title, 'BKG Method Changed to ' + this.value)
    fetchCallback()
}

function windowSliderCallback(){
    //oninput behavior of the window width slider

    var hours = Math.floor(parseInt(this.value, 10) / 60);
    var minutes = parseInt(this.value, 10) % 60;

    document.getElementById(this.id+'Value').innerHTML = hours + 'h:' + minutes +'m'
}

function leadingEdgeSliderCallback(){
    //oninput behavior of the window leading edge slider

    var seconds = windowLeadingEdgeTime();
    var hours = Math.floor(seconds / (3600));
    var minutes = Math.floor((seconds % 3600) / 60);

    document.getElementById(this.id+'Value').innerHTML = hours + 'h:' + minutes +'m ago'
    if(this.value == 0)
        document.getElementById(this.id+'Value').innerHTML = 'now'
}

function toggleDygraph(index){
    //set the dygraph series at index to the state of a checkbox, used as onchange callback
    dataStore.dygraph.setVisibility(index, this.checked);
}

////////////////////////
// Helpers
////////////////////////

function windowLeadingEdgeTime(){
    //returns number of seconds in the past the currently requested window leading edge is

    var leadingEdgeSlider = document.getElementById('leadingEdgeSlider');
    var first = dataStore.rateData[0][0];
    var last = dataStore.rateData[dataStore.rateData.length - 1][0];
    var history = -1 * parseInt(leadingEdgeSlider.value,10) / ( parseInt(leadingEdgeSlider.max,10) - parseInt(leadingEdgeSlider.min,10) );

    return Math.floor((last-first)*history / 1000);
}

function constructAutoBackgroundRange(min, max){
    //returns [[bin numbers], [corresponding bin values]] based on the gate described by min, max,
    //for use as a background sample to fit to.

    var halfwidth, lowerBKG, upperBKG, bkg, bins, i;

    halfwidth = 3*(max-min);
    lowerBKG = dataStore.viewer.plotBuffer[dataStore.targetSpectrum].slice(min - halfwidth, min);
    upperBKG = dataStore.viewer.plotBuffer[dataStore.targetSpectrum].slice(max, max + halfwidth );
    bkg = lowerBKG.concat(upperBKG);
    bins = []
    for(i=0; i<halfwidth; i++){
        bins[i] = i + min - halfwidth;
        bins[i+halfwidth] = i + max;
    }
    return dataStore.viewer.scrubPeaks(bins, bkg);

}

function constructManualBackgroundRange(encoding, spectrum){
    //given an encoded string of bins, parse and return an array consising of an array of those bin numbers, and
    //another array of the corresponding bin heights.
    //encoding is as 20-25;27;32-50 etc.
    var rangeStrings = encoding.split(';'),
        i, j, ranges = [],
        x = [], y = [];

    if(encoding == "")
        return [x, y]

    for(i=0; i<rangeStrings.length; i++){
        ranges.push( rangeStrings[i].split('-').map(function(val){return parseInt(val, 10)}) );
    }

    for(i=0; i<ranges.length; i++){
        if(ranges[i].length == 1){
            x.push(ranges[i][0]);
            y.push(spectrum[ranges[i][0]]);
        } else{
            for(j=ranges[i][0]; j<=ranges[i][1]; j++){
                x.push(j);
                y.push(spectrum[j]);
            }
        }
    }

    return [x,y]
}

function parseScalars(scalars){
    
    dataStore.scalars = {
        'PC': scalars[0].MSRD[39],
        'LF1': scalars[0].MSRD[29],
        'LF2': scalars[0].MSRD[30]
    }
}

////////////////////////////////////////
// handle gamma windows
////////////////////////////////////////

function toggleGammaWindow(index){
    //toggle the indexed gamma window on or off in the spectrum

    //present, remove
    if(dataStore.viewer.verticals['min'+index] && dataStore.viewer.suppressedAnnotations.indexOf('min'+index) == -1  ){
        dataStore.viewer.suppressAnnotation('min'+index);
        dataStore.viewer.suppressAnnotation('max'+index);

        dataStore.dygraph.setVisibility(index, false);
    //not present, add
    } else{
        drawWindow(index, document.getElementById('min'+index).value, document.getElementById('max'+index).value );
        dataStore.dygraph.setVisibility(index, true);
    }

    this.dataStore.viewer.plotData();
}

function moveGammaWindow(){
    //callback for chaging gamma window edges

    var color = dataStore.viewer.verticals[this.id].color
    dataStore.viewer.removeVertical(this.id)
    dataStore.viewer.addVertical(this.id, parseInt(this.value, 10), color)
    queueAnnotation(dataStore.defaults.gammas[parseInt(this.id.slice(3),10)].title, 'Gate ' + this.id.substring(0,3) + ' updated to ' + this.value)

    dataStore.viewer.plotData();
}

function drawWindow(index, min, max){
    //draw the appropriate window on the plot; index corresponds to dataStore.defaults.gammas[index]

    //delete the old lines
    dataStore.viewer.removeVertical('min' + index);
    dataStore.viewer.removeVertical('max' + index);
    //make new lines
    dataStore.viewer.addVertical('min' + index, min, dataStore.defaults.gammas[index].color)
    dataStore.viewer.addVertical('max' + index, max, dataStore.defaults.gammas[index].color)
    //make sure these lines aren't getting suppressed
    dataStore.viewer.unsuppressAnnotation('min' + index);
    dataStore.viewer.unsuppressAnnotation('max' + index);
}

function snapGateToWindow(){
    //callback for button to snap corresponding gamma gate to present window
    var index = this.id.slice(4)

    document.getElementById('min'+index).value = dataStore.viewer.XaxisLimitMin;
    document.getElementById('max'+index).value = dataStore.viewer.XaxisLimitMax;

    document.getElementById('min'+index).onchange()
    document.getElementById('max'+index).onchange()
}

///////////////////////////////
// annotation wrangling
///////////////////////////////

function queueAnnotation(series, flag){
    //sets up the <flag> text to appear in the annotation for the next point on <series>

    if(dataStore.annotations[series] && dataStore.annotations[series].text.indexOf(flag) == -1){
        dataStore.annotations[series].text += '\n' + flag;
    } else{
        dataStore.annotations[series] = {
            'series': series,
            'shortText': '?',
            'text': flag,
            'cssClass': 'annotation'
        }
    }
}

///////////////////////////////
// dygraph wrangling
///////////////////////////////

function createRateMonitor(){
    //plot intensity versus AQ in a div#divID, and show magnet transmission region

    var i, labels = ['time']

    //construct plot labels
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        labels.push(dataStore.defaults.gammas[i].title);
    }
    for(i=0; i<dataStore.defaults.levels.length; i++){
        labels.push(dataStore.defaults.levels[i].title)
    }


    dataStore.dygraph = new Dygraph(
        // containing div
        document.getElementById('dygraph'),

        // data
        dataStore.rateData,

        //style
        {   
            labels: labels,
            title: 'Gate Integrals for ' + dataStore.targetSpectrum,
            height: document.getElementById('plotID').offsetHeight - dataStore.viewer.bottomMargin + 20,
            width: document.getElementById('plotID').offsetWidth,
            colors: dataStore.colors,
            axisLabelColor: '#FFFFFF',
            axes: {
                x: {
                    axisLabelFormatter: function(Date, granularity, opts, dygraph){
                        return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                    }
                }
            },
            labelsDiv: 'rateLegend',
            legend: 'always'
        }
    );
}

function updateDygraph(){
    //decide how many points to keep from the history, and plot.
    var i, period, leadingEdge, data, annotations, keys

    //extract the appropriate tail of the data history
    leadingEdge = windowLeadingEdgeTime() / 3;
    period = parseInt(document.getElementById('windowSlider').value,10) * 60 // in seconds
    period = Math.ceil(period/3); //this many points to keep at the end, 3 seconds per point
    data = dataStore.rateData.slice(Math.max(0,dataStore.rateData.length - period - leadingEdge), Math.max(0,dataStore.rateData.length - leadingEdge));

    //update the dygraph
    dataStore.dygraph.updateOptions( { 'file': data } );

    //update annotations
    keys = Object.keys(dataStore.annotations)
    if(keys.length > 0 ){
        annotations = dataStore.dygraph.annotations()
        for(i=0; i<keys.length; i++){
            dataStore.annotations[keys[i]].x = data[data.length-1][0].getTime();
            annotations.push(dataStore.annotations[keys[i]]);
        }
        dataStore.dygraph.setAnnotations(annotations)
        dataStore.annotations = {};
    }
}