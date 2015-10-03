/////////////////////////////////
// define data
/////////////////////////////////

function dataSetup(data){

    //generate list of all available plots and routes
    var plots = [
        {'plotID': 'gammas', 'title': 'plot number one'},
        {'plotID': 'betas', 'title': 'plot number two'},
        {'plotID': 'alphas', 'title': 'plot number three'}
    ]

    var groups = [
        {'groupTitle': 'Group A', 'groupID': 'A', 'plots': plots},
        {'groupTitle': 'Group B', 'groupID': 'B', 'plots': plots},
        {'groupTitle': 'Group C', 'groupID': 'C', 'plots': plots},
        {'groupTitle': 'Group D', 'groupID': 'D', 'plots': plots}
    ]

    return {
        'groups': groups
    }

}

function fetchSpectrum(id){
    //return the y-values of the requested spectrum in an array.

    if(id.slice(1)=='gammas')
        return dataStore.testData;
    if(id.slice(1)=='betas')
        return createBins(500);
    if(id.slice(1)=='alphas')
        return createBins(500, 10);
}

////////////////////////////////////////////
// data refresh
////////////////////////////////////////////

function refreshPlots(){
    // re-fetch all the plots currently displayed.

    //var sequence = Promise.resolve();
    var plotKeys = Object.keys(dataStore.viewer.plotBuffer);

    // sequence.then(function(){
    //     return Promise.all(plotKeys.map(fetchSpectrum))
    // }).then(dataStore.viewer.plotData)
    
    Promise.all(plotKeys.map(fetchSpectrum)).then(dataStore.viewer.plotData.bind(dataStore.viewer) )

}

////////////////////////////////////////////
// setup helpers
////////////////////////////////////////////

function pageLoad(){
    //runs after ultralight is finished setting up the page.

    var i, radios;

    createFigure();

    //set up clickable list items in plot selection
    (function() {
        var plots = document.getElementById('plotMenu').getElementsByTagName('li'), 
        i;

        for (i=0; i < plots.length; i++) {
            plots[i].onclick = toggleData;
        }
    })();

    //plug in plot control callbacks:

    //x-range control:
    document.getElementById('minX').onchange = updatePlotRange;
    document.getElementById('maxX').onchange = updatePlotRange;
    dataStore.viewer.chooseLimitsCallback = updateRangeSelector

    //onclick for scroll buttons - 1D:
    document.getElementById('bigLeft').onclick = dataStore.viewer.scrollSpectra.bind(dataStore.viewer, -100);
    document.getElementById('littleLeft').onclick = dataStore.viewer.scrollSpectra.bind(dataStore.viewer, -1);
    document.getElementById('littleRight').onclick = dataStore.viewer.scrollSpectra.bind(dataStore.viewer, 1);
    document.getElementById('bigRight').onclick = dataStore.viewer.scrollSpectra.bind(dataStore.viewer, 100);

    //unzoom button
    document.getElementById('unzoom').onclick = dataStore.viewer.unzoom.bind(dataStore.viewer);

    //lin-log toggle
    radios = document.getElementById('logToggleWrap').getElementsByTagName('input');
    for(i = 0; i < radios.length; i++) {
        radios[i].onclick = function() {
            dataStore.viewer.setAxisType(this.value)
        };
    }

    //update interval select
    document.getElementById('upOptions').onchange = startRefreshLoop;
    //update now button
    document.getElementById('upNow').onclick = refreshPlots;

    //fit mode trigger
    document.getElementById('fitMode').onclick = toggleFitMode;
    //fitting callback:
    dataStore.viewer.fitCallback = fitCallback

    //snap to waveform toggle
    document.getElementById('snapToWaveform').onclick = toggleSnapWaveform;    

}

function startRefreshLoop(){
    //sets the refresh loop as a callback to changing the selector menu.

    var period = parseInt(this.value,10); //in seconds

    clearInterval(dataStore.dataRefreshLoop);
    if(period != -1)
        dataStore.dataRefreshLoop = setInterval(refreshPlots, parseInt(this.value,10) );

}

function toggleData(){
    var html, node, rows;

    //data present, remove it
    if(dataStore.viewer.plotBuffer[this.id]){ 
        //remove data
        dataStore.viewer.removeData(this.id);     
        //remove row from fit table          
        node = document.getElementById('fitRow'+this.id)    
        node.parentNode.removeChild(node)
        //re-target the fitting if this was the dataset fitting currently targeted
        if(dataStore.viewer.fitTarget == this.id){          
            dataStore.viewer.fitTarget = null
            rows = document.getElementById('fitTable').getElementsByTagName('tbody')[0].getElementsByTagName('tr')
            if(rows.length > 1)
                document.getElementById(rows[1].id.slice(6)+'Radio').click()
        }
    // data absent, add it.
    } else {  
        //add data
        dataStore.viewer.addData(this.id, fetchSpectrum(this.id))
        //generate html for fit table and add it
        html = Mustache.to_html(spectrumViewerUL.partials['fitRow'], {'spectrum': this.id});
        document.getElementById('fitTable').getElementsByTagName('tbody')[0].innerHTML += html;
        //default: target fitting at new spectrum.
        chooseFitTarget(this.id)
    }

    //toggle indicator
    toggleHidden('badge'+this.id)

    dataStore.viewer.plotData();
}

function togglePlotList(id){
    //change whether a plot list is open or closed, for binding to the onclick of the subheaders
    toggleHidden('plots'+id);
    toggleHidden('closed'+id);
    toggleHidden('open'+id);

}

////////////////////////
// fitting
////////////////////////

function toggleFitMode(){
    //manage the state of the Fit Mode button, and the corresponding state of the viewer.
    var fitModeSwitch = document.getElementById('fitMode')
    var state = fitModeSwitch.getAttribute('engaged')

    if(state == 0){
        dataStore.viewer.setupFitMode();
        fitModeSwitch.setAttribute('engaged', 1);
    }
    else{
        dataStore.viewer.leaveFitMode();
        fitModeSwitch.setAttribute('engaged', 0);
    }

    //toggle state indicator
    toggleHidden('fitModeBadge')
}

function chooseFitTarget(id){
    //callback for fit target radios
    dataStore.viewer.fitTarget = id;
}

//callback for peak fit
function fitCallback(center, width){
    var spectrum = dataStore.viewer.fitTarget,
        reportDiv = document.getElementById(spectrum+'FitResult');

    if(reportDiv.innerHTML == '-')
        reportDiv.innerHTML = '';

    reportDiv.innerHTML += 'Center: ' + center.toFixed(2) + ', Width: ' + width.toFixed(2) + '<br>';

    toggleFitMode()
    dataStore.viewer.leaveFitMode();
}

function toggleSnapWaveform(){

    //toggle state indicator
    toggleHidden('waveformBadge')
}

function createFigure(){
    //set up the canvas and viewer object

    var width = 0.9*document.getElementById('plotWrap').offsetWidth;
    var height = 32/48*width;
    var canvas = document.getElementById('plotID')

    canvas.width = width;
    canvas.height = height;
    dataStore.viewer = new spectrumViewer('plotID');
    dataStore.viewer.plotData();
}

////////////////////////////////////
// UI callbacks
////////////////////////////////////

//update the plot ranges onchange of the x-range input fields:
function updatePlotRange(){
    var xMin = document.getElementById('minX'),
        xMax = document.getElementById('maxX');

    dataStore.viewer.XaxisLimitMin = parseInt(xMin.value,10);
    dataStore.viewer.XaxisLimitMax = parseInt(xMax.value,10);

    dataStore.viewer.plotData();              
};

//update the UI when the plot is zoomed with the mouse
function updateRangeSelector(){
    var xMin = dataStore.viewer.XaxisLimitMin,
        xMax = dataStore.viewer.XaxisLimitMax

    document.getElementById('minX').value = xMin;
    document.getElementById('maxX').value = xMax;

}

dataStore = {}
dataStore.activeSpectra = [];
dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];