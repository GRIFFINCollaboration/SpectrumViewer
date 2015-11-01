////////////////////////////////////////////
// main setup
////////////////////////////////////////////

// function setupDataStore(){
//     //sets up global variable datastore
//     //invoked as the spectrum list is initially populated.

//     dataStore = {}
//     dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/'
//     dataStore.ODBrequests = ['http://grsmid00.triumf.ca:8081/?cmd=jcopy&odb0=/Runinfo/Run number&encoding=json-p-nokeys&callback=parseODB'];
//     dataStore.zeroedPlots = {}
//     dataStore.plotWidthFraction = 0.98
//     //what order to display groups of plots in on the plot menu:
//     dataStore.listOrder = {
//         'HIT': 0,
//         'SUM': 1,
//         'GRG': 2,
//         'SEP': 3,
//         'DSC': 4
//     };
//     dataStore.detectorCodes = {
//         'GRG': 'GRIFFIN',
//         'DSC': 'DESCANT',
//         'SEP': 'SCEPTAR'  
//     }
//     dataStore.activeSpectra = [];
//     dataStore.spectra = {};
//     dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
// }

function setupDataStore(){
    var i,j
    var griffinQuads = ['B', 'G', 'R', 'W'];
    var griffinCodes = []
    var sceptarCodes = []
    var descantCodes = []

    //generate GRIFFFIN detector nomenclature codes
    for(i=1; i<17; i++){
        for(j=0; j<griffinQuads.length; j++){
            griffinCodes.push('GRG' + alwaysThisLong(i,2) + griffinQuads[j] + 'N00A');
        }
    }

    //generate SCEPTAR detector nomenclature codes
    for(i=1; i<21; i++){
        sceptarCodes.push('SEP' + alwaysThisLong(i,2) + 'XN00X');
    }

    //generate DESCANT detector nomenclature codes
    for(i=1; i<71; i++){
        descantCodes.push('DSC' + alwaysThisLong(i,2) + 'XN00X');
    }

    //declare top level groups
    var topGroups = [
        {
            "name": "Hit Patterns & Sums",
            "id": "hitsAndSums",
            "color": '#BF55EC',
            "subGroups": [
                {
                    "subname": "Hit Patterns",
                    "id": "hits",
                    "items": [
                        'HITPATTERN_Energy',
                        'HITPATTERN_Time',
                        'HITPATTERN_Waveform',
                        'HITPATTERN_Pulse_Height',
                        'HITPATTERN_Rate'
                    ]
                },
                {
                    "subname": "Sum Spectra",
                    "id": "sums",
                    "items": [
                        'SUM_Singles_Energy',
                        'SUM_Addback_Energy'
                    ]
                }
            ]
        },

        {
            "name": "GRIFFIN",
            "id": "GRIFFIN",
            "color": '#4183D7',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "GRGenergy",
                    "items": griffinCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "GRGtime",
                    "items": griffinCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "GRGpulseHeight",
                    "items": griffinCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "GRGwaveform",
                    "items": griffinCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "SCEPTAR",
            "id": "SCEPTAR",
            "color": '#87D37C',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "SEPenergy",
                    "items": sceptarCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "SEPtime",
                    "items": sceptarCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "SEPpulseHeight",
                    "items": sceptarCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "SEPwaveform",
                    "items": sceptarCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "DESCANT",
            "id": "DESCANT",
            "color": '#E87E04',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "DSCenergy",
                    "items": descantCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "DSCtime",
                    "items": descantCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "DSCpulseHeight",
                    "items": descantCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "DSCwaveform",
                    "items": descantCodes.map(function(c){return c + '_Waveform'})
                },
                {
                    "subname": "Zero Crossing",
                    "id": "DSCzero",
                    "items": descantCodes.map(function(c){return c + '_Zero_Crossing'})
                },
                {
                    "subname": "Long Integration",
                    "id": "DSClongInt",
                    "items": descantCodes.map(function(c){return c + '_Long_Integration'})
                },
                {
                    "subname": "Short Integration",
                    "id": "DSCshortInt",
                    "items": descantCodes.map(function(c){return c + '_Short_Integration'})
                }
            ]
        }
    ]

    dataStore = {
        "topGroups": topGroups,
        "plotNameListeners": ['listener', 'anotherListener']
    }

}
setupDataStore();


function pageLoad(){
    //runs after ultralight is finished setting up the page.

    var i, plotSelectorSections, plotToggles;

    createFigure();
    //plug in plot control callbacks:
    setupFigureControl();
    setupFitting();
 
    //set up plot selection top row
    plotSelectorSections = document.getElementsByClassName('topRowSection')
    for(i=0; i<plotSelectorSections.length; i++){
        plotSelectorSections[i].onclick = selectMenuSection;
    }

    //set up plot toggles
    plotToggles = document.getElementsByClassName('dd-item')
    for(i=0; i<plotToggles.length; i++){
        plotToggles[i].onclick = toggleData;
    }

    //plug in the delete all button
    document.getElementById('deleteAll').onclick = deleteAllPlots;

    //plug in the waveform snap buttion
    document.getElementById('snapWaveform').onclick = waveformSnap;

    //set the refresh loop going
    startRefreshLoop.bind(document.getElementById('upOptions'))();

    //start with the griffin menu selected
    document.getElementById('GRIFFIN').onclick();

}

/////////////////////
// General Helpers
/////////////////////

function groupTitle(groupID){
    //generate a human-friendly title for each group of plots based on their groupID key.

    var detectorCodes = dataStore.detectorCodes;

    if(groupID == 'HITPATTERN')
        return 'Hit Patterns';
    else if(groupID == 'SUM')
        return 'Sum Spectra';
    else{
        return detectorCodes[groupID.slice(0,3)] + ' ' + groupID.slice(3);
    }
}

function getSpectrumList(spectra){
    //JSONP wrapper to process the spectrum list from the analyzer.
    setupDataStore()
    dataStore.spectrumList = spectra.spectrumlist;
    console.log(dataStore.spectrumList)
}

function fetchCallback(){
    //fires after all data has been updated
    dataStore.viewer.plotData(true);
}

function parseODB(payload){
    //keep track of the current run number

    dataStore.currentRun = payload[0]['Run number']

    //dump all spectra zeroing on run change
    if(dataStore.currentRun != dataStore.lastRun){
        dataStore.viewer.baselines = {}
        dataStore.lastRun = dataStore.currentRun
    }
}

function selectMenuSection(){
    if(dataStore.currentSubrow){
        document.getElementById(dataStore.currentSubrow).classList.toggle('hidden')
        document.getElementById('tab' + dataStore.currentSubrow.slice(6)).classList.toggle('active')

    }
    document.getElementById('subrow' + this.id).classList.toggle('hidden')
    document.getElementById('tab' + this.id).classList.toggle('active')
    dataStore.currentSubrow = 'subrow' + this.id;
}

//////////////////////////////////
// data series management
//////////////////////////////////

function toggleData(event){
    //handles adding and removing data from the histogram
    //intended as callback to toggling items in the plot list.
    var html, node, rows, deleteButtons, zeroButtons, dropFitButtons, i;

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
        html = Mustache.to_html(spectrumViewerUL.partials['fitRow'], {'spectrum': this.id, 'color': dataStore.viewer.dataColor[dataStore.viewer.colorAssignment.indexOf(this.id)]});
        document.getElementById('fitTable').getElementsByTagName('tbody')[0].innerHTML += html;
        //have to re-set up all delete & zero buttons after modifying table html
        deleteButtons = document.getElementsByClassName('deleteRow')
        for(i=0; i<deleteButtons.length; i++){
            deleteButtons[i].onclick = toggleData.bind(document.getElementById(deleteButtons[i].value));
        }
        zeroButtons = document.getElementsByClassName('zeroRow')
        for(i=0; i<zeroButtons.length; i++){
            zeroButtons[i].onclick = zeroPlot.bind(zeroButtons[i]);
        }
        dropFitButtons = document.getElementsByClassName('dropFitRow')
        for(i=0; i<dropFitButtons.length; i++){
            dropFitButtons[i].onclick = dropFit.bind(dropFitButtons[i]);
        }

        //default: target fitting at new spectrum.
        chooseFitTarget(this.id)
    }

    //toggle indicator
    //document.getElementById('badge'+this.id).classList.toggle('hidden')

    //don't close dropdown onclick
    if(event)
        event.stopPropagation();
}

function deleteAllPlots(){
    //callback to delete all button
    var deleteButtons = document.getElementsByClassName('deleteRow')

    while(deleteButtons.length > 0){
        deleteButtons[0].onclick(); //actually modifies deleteButtons in place - keep deleting zeroth element.
    }
}

function zeroPlot(){
    //callback for button to zero plot named at this.value.
    var spectrumID = this.value;

    dataStore.viewer.baselines[spectrumID] = dataStore.viewer.plotBuffer[spectrumID];
    dataStore.viewer.plotData();
}

function dropFit(){
    //abandon last fit result for this spectrum
    var spectrumID = this.value
    var text = document.getElementById(spectrumID+'FitResult').innerHTML
    text = text.split('<br>')
    text = text.slice(0, text.length-2).join('<br>')
    if(text=='')
        text = '-'

    document.getElementById(spectrumID+'FitResult').innerHTML = text
    dataStore.viewer.plotData();
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
        document.getElementById('fitBadge').classList.add('redText')
    }
    else{
        dataStore.viewer.leaveFitMode();
        fitModeSwitch.setAttribute('engaged', 0);
        document.getElementById('fitBadge').classList.remove('redText')
    }

    //toggle state indicator
    document.getElementById('fitInstructions').classList.toggle('hidden')
}

function chooseFitTarget(id){
    //callback for fit target radios
    dataStore.viewer.fitTarget = id;
}

//callback for peak fit
function fitCallback(center, width, amplitude, intercept, slope){
    var spectrum = dataStore.viewer.fitTarget,
        reportDiv = document.getElementById(spectrum+'FitResult'),
        integral = 0,
        functionVals = [],
        i, x, sigmas = 5, stepSize = 0.01;

    if(reportDiv.innerHTML == '-')
        reportDiv.innerHTML = '';

    //calculate peak area in excess of background, for <sigmas> up and down.
    for(i=0; i<2*sigmas*width/stepSize; i++){
        x = center - sigmas*width + i*stepSize
        functionVals.push( gauss(amplitude, center, width, x)*stepSize )
        integral = functionVals.integrate()
    }

    reportDiv.innerHTML += 'Center: ' + center.toFixed(2) + ', SD: ' + width.toFixed(2) + ', Area: ' + integral.toFixed(2) + '<br>';

    toggleFitMode()
    dataStore.viewer.leaveFitMode();
}

function setupFitting(){
    //setup fitting infrastructure
    //fit mode trigger
    document.getElementById('fitMode').onclick = toggleFitMode;
    //fitting callback:
    dataStore.viewer.fitCallback = fitCallback    
}