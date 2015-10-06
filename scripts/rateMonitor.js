function dataSetup(data){
    //define data for templates

    return dataStore.defaults

}

function fetchSpectrum(id){
    //refreshes the data for spectrum id.
    dataStore.viewer.addData(id, dataStore.testData);
}

function fetchCallback(){
    //runsas callback after all data has been refreshed.
    dataStore.viewer.plotData();
}

function pageLoad(){
    //runs after ultralight is finished setting up the page.
    var i, gammaWindowToggles, gammaWindowEdges, snapGammaButtons;

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

}

////////////////////////////////////////
// handle gamma windows
////////////////////////////////////////

function toggleGammaWindow(index){
    //toggle the indexed gamma window on or off in the spectrum
    var id = dataStore.defaults.gammas[index].id

    //present, remove
    if(dataStore.viewer.verticals['min'+id]){
        dataStore.viewer.removeVertical('min'+id);
        dataStore.viewer.removeVertical('max'+id);
    //not present, add
    } else{
        drawWindow(index, document.getElementById('min'+id).value, document.getElementById('max'+id).value );
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
    dataStore.viewer.removeVertical('min' + dataStore.defaults.gammas[index].id);
    dataStore.viewer.removeVertical('max' + dataStore.defaults.gammas[index].id);

    dataStore.viewer.addVertical('min' + dataStore.defaults.gammas[index].id, min, dataStore.defaults.gammas[index].color)
    dataStore.viewer.addVertical('max' + dataStore.defaults.gammas[index].id, max, dataStore.defaults.gammas[index].color)
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

    var data = [0,0,0,0]

    dataStore.dygraph = new Dygraph(
        // containing div
        document.getElementById('dygraph'),

        // data
        data,

        //style
        {   

        }
    );
}

dataStore = {}
dataStore.targetSpectrum = 'fakeSpectrum'
dataStore.defaults = {
        'gammas':[
            {
                'title': 'Gate 1',
                'id': 'g1',
                'min': 10,
                'max': 20,
                'color': '#D35400'
            },
            {
                'title': 'Gate 2',
                'id': 'g2',
                'min': 100,
                'max': 120,
                'color': '#1BA39C'
            },
            {
                'title': 'Gate 3',
                'id': 'g3',
                'min': 200,
                'max': 240,
                'color': '#9A12B3'
            },  
        ],

        'parameters':[
            {
                'title': 'Proton Current',
                'id': 'PC'
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
dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];