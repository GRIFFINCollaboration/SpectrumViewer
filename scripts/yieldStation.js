function setupDataStore(){

    var topGroups = [
        {
            "name": "Demo",
            "id": "demo",
            "subGroups": [
                {
                    "subname": "Example",
                    "id": "example",
                    "items": ['dummy_decay', 'dummy_spectrum']
                }
            ]
        }
    ]

    dataStore = {}

    dataStore.rawData = [];
    dataStore.topGroups = topGroups;

    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';       //host and port of analyzer
    dataStore.plots = ['yield-station'];                                //names of viewer objects (only one in this case)
    dataStore.ODBrequests = [];
    dataStore.doUpdates = true;                                         //include update loop
    dataStore.plotHelpText = "Zoom: Click and drag or single-click on either side of the window to zoom to. <br><br> Unzoom: Double-click. <br><br> Set the fit region for the current fit: shift-click either side of the fit region."
    dataStore.tableIndex = 0;                                           //serial number for fitting table row elements
    dataStore.newFitRegion = [];
    dataStore.fitLines = [];
    dataStore.pageTitle = "Yield Station";
    dataStore.componentIndex = 0;                                       //monotonic counter for components to fit
}
setupDataStore();

function fetchCallback(){
    //runs as callback after all data has been refreshed.
    dataStore.viewers[dataStore.plots[0]].plotData();
}

function fitDecay(){
    // fit the decay curve, and perform yield calculations

    var viewer = dataStore.viewers[dataStore.plots[0]], 
        histo = viewer.plotBuffer[dataStore.currentSpectrum],
        min = parseInt(document.getElementById('decayMinBin').value,10),
        max = parseInt(document.getElementById('decayMaxBin').value,10),
        lifetimes = document.getElementsByClassName('component-lifetime').toArray().map(function(current, index, arr){
            return current.value
        }),
        amplitudeGuess = document.getElementsByClassName('component-amplitude').toArray().map(function(current, index, arr){
            return current.value
        }),
        backgroundGuess = 1,
        fitResult = fitMulticomponentDecayPlusFlatBkg(histo, min, max, lifetimes, amplitudeGuess, backgroundGuess);

    // draw the fit
    viewer.dropPersistentOverlay();
    viewer.updatePersistentOverlay(fitResult);
}

// function shiftClick(event){
//     // define a new fit region.
//     var viewer = dataStore.viewers[dataStore.plots[0]],
//         x = viewer.canvas.relMouseCoords(event).x,
//         y = viewer.canvas.relMouseCoords(event).y,
//         bins = viewer.coord2bin(x,y),
//         targetRow, buffer;

//     dataStore.newFitRegion.push(bins.x);

//     if(dataStore.newFitRegion.length == 2){
//         // finished defining a new fit region; add new row to table and populate

//         //no backwards regions
//         if(dataStore.newFitRegion[0] > dataStore.newFitRegion[1]){
//             buffer = dataStore.newFitRegion[0];
//             dataStore.newFitRegion[0] = dataStore.newFitRegion[1];
//             dataStore.newFitRegion[1] = buffer;
//         }

//         createNewFitRow();
//         targetRow = dataStore.tableIndex-1;
//         document.getElementById(`fitLo${targetRow}`).value = dataStore.newFitRegion[0];
//         document.getElementById(`fitHi${targetRow}`).value = dataStore.newFitRegion[1];
//         dataStore.newFitRegion = [];
//         reassess(targetRow);
//     }
// }

// function createNewFitRow(){
//     // add a row for a new gamma ray to the fitting table

//     var row = document.createElement('tr');

//     row.innerHTML = Mustache.to_html(
//         dataStore.templates.yieldFitRow, 
//         {
//             'index': dataStore.tableIndex
//         }
//     );
//     row.setAttribute('id', `row${dataStore.tableIndex}`)
//     document.getElementById('fitTable').appendChild(row);

//     //plug in the delete button
//     document.getElementById(`delete${dataStore.tableIndex}`).onclick = deleteFit.bind(this, dataStore.tableIndex);

//     dataStore.tableIndex++;
// }

// function reassess(rowIndex){
//     //recalculate everything in the indicated row

//     var viewer = dataStore.viewers[dataStore.plots[0]],
//         result;

//     // new fit
//     viewer.FitLimitLower = parseInt(document.getElementById(`fitLo${rowIndex}`).value, 10);
//     viewer.FitLimitUpper = parseInt(document.getElementById(`fitHi${rowIndex}`).value, 10);
//     viewer.fitLineColor = viewer.dataColor[rowIndex%viewer.dataColor.length];
//     result = viewer.fitData(dataStore.plots[0], 0);

//     // store the fit line object for later
//     dataStore.fitLines[rowIndex] = result.fitLine;

//     // update some table values
//     document.getElementById(`swatch${rowIndex}`).style = `background-color:${result.color}`
//     document.getElementById(`center${rowIndex}`).innerHTML = result.center.toFixed(2);
//     document.getElementById(`width${rowIndex}`).innerHTML = result.width.toFixed(2);
//     document.getElementById(`amplitude${rowIndex}`).innerHTML = result.amplitude.toFixed(2);
//     document.getElementById(`slope${rowIndex}`).innerHTML = result.slope.toFixed(2);
//     document.getElementById(`intercept${rowIndex}`).innerHTML = result.intercept.toFixed(2);

//     console.log(result)
// }

// function deleteFit(rowIndex){
//     // delete the indicated table row and corresponding fit line

//     dataStore.viewers[dataStore.plots[0]].containerFit.removeChild(dataStore.fitLines[rowIndex]);
//     dataStore.viewers[dataStore.plots[0]].stage.update();
//     deleteNode(`row${rowIndex}`);
// }

