function dataSetup(data){
    //define data for templates

    return dataStore.defaults

}

function fetchSpectrum(id){
    //refreshes the data for spectrum id.
    dataStore.viewer.addData(id, dataStore.testData);
}

function fetchCallback(){
    //runs as callback after all data has been refreshed.
    dataStore.viewer.plotData();

    //update the rate monitor
    appendNewPoint();
}

function appendNewPoint(){
    //integrate gamma windows and append result as new point on rate monitor.
    var i, j, min, max, gates = [];
    //integrate gamma windows
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        min = dataStore.viewer.verticals['min' + dataStore.defaults.gammas[i].id].bin
        max = dataStore.viewer.verticals['max' + dataStore.defaults.gammas[i].id].bin
        gates[i] = 0;
        for(j=min; j<max; j++){
            gates[i] += dataStore.viewer.plotBuffer[dataStore.targetSpectrum][j];
        } 
    }

    //update data history
    dataStore.rateData.push( [new Date()].concat(gates) );

    //update plot
    updateDygraph();

}

function updateDygraph(){
    //decide how many points to keep from the history, and plot.
    var period, data, 

    //extract the appropriate tail of the data history
    period = getSelected('rateHistory')
    if(period == -1)
        data = dataStore.rateData
    else{
        period = Math.ceil(period/3); //this many points to keep at the end
        data = dataStore.rateData.slice(Math.max(0,dataStore.rateData.length - period));
    }

    //update the dygraph
    dataStore.dygraph.updateOptions( { 'file': data } );
}

function pageLoad(){
    //runs after ultralight is finished setting up the page.
    var i, node, gammaWindowToggles, gammaWindowEdges, snapGammaButtons;

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

    document.getElementById('rateHistory').onchange = updateDygraph

    //start periodic refresh
    document.getElementById('upOptions').value = 3000;
    document.getElementById('upOptions').onchange();
    //don't allow refresh period to change
    node = document.getElementById("updateWrap");
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }

}

////////////////////////////////////////
// handle gamma windows
////////////////////////////////////////

function toggleGammaWindow(index){
    //toggle the indexed gamma window on or off in the spectrum
    var id = dataStore.defaults.gammas[index].id

    //present, remove
    if(dataStore.viewer.verticals['min'+id] && dataStore.viewer.suppressedAnnotations.indexOf('min'+id) == -1  ){
        dataStore.viewer.suppressAnnotation('min'+id);
        dataStore.viewer.suppressAnnotation('max'+id);

        dataStore.dygraph.setVisibility(index, false);
    //not present, add
    } else{
        drawWindow(index, document.getElementById('min'+id).value, document.getElementById('max'+id).value );
        dataStore.dygraph.setVisibility(index, true);
    }

    this.dataStore.viewer.plotData();
}

function moveGammaWindow(){
    //callback for chaging gamma window edges

    var color = dataStore.viewer.verticals[this.id].color
    dataStore.viewer.removeVertical(this.id)
    dataStore.viewer.addVertical(this.id, this.value, color)

    dataStore.viewer.plotData();
}

function drawWindow(index, min, max){
    //draw the appropriate window on the plot; index corresponds to dataStore.defaults.gammas[index]
    var id = dataStore.defaults.gammas[index].id;
    //delete the old lines
    dataStore.viewer.removeVertical('min' + id);
    dataStore.viewer.removeVertical('max' + id);
    //make new lines
    dataStore.viewer.addVertical('min' + id, min, dataStore.defaults.gammas[index].color)
    dataStore.viewer.addVertical('max' + id, max, dataStore.defaults.gammas[index].color)
    //make sure these lines aren't getting suppressed
    dataStore.viewer.unsuppressAnnotation('min' + id);
    dataStore.viewer.unsuppressAnnotation('max' + id);
}

function snapGateToWindow(){
    //callback for button to snap corresponding gamma gate to present window
    document.getElementById('min'+this.id).value = dataStore.viewer.XaxisLimitMin;
    document.getElementById('max'+this.id).value = dataStore.viewer.XaxisLimitMax;

    document.getElementById('min'+this.id).onchange()
    document.getElementById('max'+this.id).onchange()
}

///////////////////////////////
// dygraph wrangling
///////////////////////////////

function createRateMonitor(){
    //plot intensity versus AQ in a div#divID, and show magnet transmission region

    dataStore.dygraph = new Dygraph(
        // containing div
        document.getElementById('dygraph'),

        // data
        dataStore.rateData,

        //style
        {   
            labels: ['time', 'gate 1', 'gate 2', 'gate 3'],
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






dataStore = {}
dataStore.rateData = [[new Date(),0,0,0]]
dataStore.targetSpectrum = 'fakeSpectrum'
dataStore.colors = [
    "#AAE66A",
    "#EFB2F0",
    "#40DDF1",
    "#F1CB3C",
    "#4FEF3E"
]
dataStore.defaults = {
        'gammas':[
            {
                'title': 'Gate 1',
                'id': 'g0',
                'min': 10,
                'max': 20,
                'color': "#AAE66A"
            },
            {
                'title': 'Gate 2',
                'id': 'g1',
                'min': 100,
                'max': 120,
                'color': "#EFB2F0"
            },
            {
                'title': 'Gate 3',
                'id': 'g2',
                'min': 200,
                'max': 240,
                'color': "#40DDF1"
            },  
        ],

        'parameters':[
            {
                'title': 'Proton Current',  //label
                'id': 'PC',                 //element id
                'target': 'pc'              //retrieval key
            },
            {
                'title': 'Laser Freq. 1',
                'id': 'LF1',
                'target': 'lf1'
            },
            {
                'title': 'Laser Freq. 2',
                'id': 'LF2',
                'target': 'lf2'
            }
        ]
    }
dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];