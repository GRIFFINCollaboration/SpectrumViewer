/////////////////////////////////
// define data
/////////////////////////////////

function dataSetup(data){

    //generate list of all available plots and routes
    var plots = [
        {'plotID': 'g', 'title': 'plot number one'},
        {'plotID': 'b', 'title': 'plot number two'},
        {'plotID': 'a', 'title': 'plot number three'}
    ]

    var groups = []

    for(var i=0; i<100; i++){
        groups.push({
            'groupTitle': 'Group '+i, 'groupID': 'group'+i, 'plots': plots
        })
    }

    return {
        'groups': groups
    }

}

function fetchSpectrum(id){
    //fetch spectrum as an array of counts indexed by bin
    //load data directly into spectrum viewer

    if(id.slice(id.length-1)=='g')
        dataStore.viewer.addData(id, dataStore.testData);
    if(id.slice(id.length-1)=='b')
        dataStore.viewer.addData(id, createBins(500));
    if(id.slice(id.length-1)=='a')
        dataStore.viewer.addData(id, createBins(500,10));
}

function fetchCallback(){
    //fires after all data has been updated

    dataStore.viewer.plotData();
}

////////////////////////////////////////////
// setup helpers
////////////////////////////////////////////

function pageLoad(){
    //runs after ultralight is finished setting up the page.
    createFigure();
    //plug in plot control callbacks:
    setupFigureControl();
    setupFitting();

    //set up clickable list items in plot selection
    (function() {
        var plots = document.getElementById('plotMenu').getElementsByTagName('li'), 
        i;

        for (i=0; i < plots.length; i++) {
            plots[i].onclick = toggleData;
        }
    })();
 
    //keep the plot list the same height as the plot region
    document.getElementById('plotMenu').style.height = document.getElementById('plotWrap').offsetHeight + 'px'; 

}

function setupFitting(){
    //setup fitting infrastructure
    //fit mode trigger
    document.getElementById('fitMode').onclick = toggleFitMode;
    //fitting callback:
    dataStore.viewer.fitCallback = fitCallback    
}

//////////////////////////////////
// data series management
//////////////////////////////////

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
        dataStore.viewer.plotData();
    // data absent, add it.
    } else {
        //don't allow more than 10 plots
        if(Object.keys(dataStore.viewer.plotBuffer).length == 10){
            alert("Won't plot more than 10 spectra at a time. Click on a spectrum name to remove it and make room for others.");
            return;
        }
        //add data
        dataStore.viewer.addData(this.id, []);
        refreshPlots();
        //generate html for fit table and add it
        html = Mustache.to_html(spectrumViewerUL.partials['fitRow'], {'spectrum': this.id});
        document.getElementById('fitTable').getElementsByTagName('tbody')[0].innerHTML += html;
        //default: target fitting at new spectrum.
        chooseFitTarget(this.id)
    }

    //toggle indicator
    toggleHidden('badge'+this.id)
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
    toggleHidden('fitInstructions')
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

dataStore = {}
dataStore.activeSpectra = [];
dataStore.spectra = {};
dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];