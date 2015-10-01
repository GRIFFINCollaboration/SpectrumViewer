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
        {'groupTitle': 'Group C', 'groupID': 'C', 'plots': plots}
    ]

    return {
        'groups': groups
    }

}

function pageLoad(){
    //runs after ultralight is finished setting up the page.

    createFigure();

    //set up clickable list items in plot selection
    (function() {
        var plots = document.getElementById('plotMenu').getElementsByTagName('li'), 
        i;

        for (i=0; i < plots.length; i++) {
            plots[i].onclick = toggleData;
        }
    })();
}

function toggleData(){
    //toggle spectrum data:
    if(dataStore.viewer.plotBuffer[this.id]){
        dataStore.viewer.removeData(this.id)
    } else {
        dataStore.viewer.addData(this.id, fetchSpectrum(this.id))
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

function createFigure(){
    //set up the canvas and viewer object

    var width = 0.9*document.getElementById('plotWrap').offsetWidth;
    var height = 32/48*width;
    var canvas = document.getElementById('plotID')

    canvas.width = width;
    canvas.height = height;
    dataStore.viewer = new spectrumViewer('plotID');
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



dataStore = {}
dataStore.activeSpectra = [];
dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];