/////////////////////////////////
// define data
/////////////////////////////////

function setupDataStore(){
    dataStore = {}
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/'
    //what order to display groups of plots in on the plot menu:
    dataStore.listOrder = {
        'HIT': 0,
        'SUM': 1,
        'GRG': 2,
        'SEP': 3,
        'DSC': 4
    };
    dataStore.detectorCodes = {
        'GRG': 'GRIFFIN',
        'DSC': 'DESCANT',
        'SEP': 'SCEPTAR'  
    }
    dataStore.activeSpectra = [];
    dataStore.spectra = {};
    dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
}

function dataSetup(data){
    //take the list of spectra, and sort it into sensible groups for the menu.
    //runs pre-Ultralight setup.

    var i, key, firstSeparator, category, subcategory, groups = [], group,
    detectedGroups={ //hitpattern and sum are hard-coded, rest are autodetected
        'HITPATTERN': [],
        'SUM': []
    }

    //split plots up into groups
    for(i=0; i<dataStore.spectrumList.length; i++){
        firstSeparator = dataStore.spectrumList[i].indexOf('_');
        category = dataStore.spectrumList[i].slice(0, firstSeparator);
        subcategory = dataStore.spectrumList[i].slice(firstSeparator+1);

        if(category == 'HITPATTERN' || category == 'SUM')
            detectedGroups[category].push({'plotID': dataStore.spectrumList[i], 'title': dataStore.spectrumList[i]});
        else{
            group = category.slice(0,3) + subcategory; //ie detector prefix + plot type
            if(!detectedGroups[group])
                detectedGroups[group] = []

            detectedGroups[group].push({'plotID': dataStore.spectrumList[i], 'title': dataStore.spectrumList[i]})
        }
    }

    //process detected groups
    for(key in detectedGroups){
        groups.push({
            'groupTitle': groupTitle(key), 'groupID': key, 'plots': detectedGroups[key]
        })
    }

    //sort groups into our preferred order
    groups.sort(function(a,b){
        var order = dataStore.listOrder;

        return order[a.groupID.slice(0,3)] > order[b.groupID.slice(0,3)];
    })

    return {
        'groups': groups
    }

}

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
    setupDataStore()
    dataStore.spectrumList = spectra.spectrumlist;
    console.log(dataStore.spectrumList)
}

function constructQueries(keys){
    //takes a list of plot names and produces the query string needed to fetch them.

    var i, query = dataStore.spectrumServer + '?cmd=callspechandler'
    for(i=0; i<keys.length; i++){
        query += '&spectrum' + i + '=' + keys[i];
    }

    return [query]
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

    //plug in the delete all button
    document.getElementById('deleteAll').onclick = deleteAllPlots;

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
    var html, node, rows, deleteButtons, i;

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
        //have to re-set up all delete buttons after modifying table html
        deleteButtons = document.getElementsByClassName('deleteRow')
        for(i=0; i<deleteButtons.length; i++){
            deleteButtons[i].onclick = toggleData.bind(document.getElementById(deleteButtons[i].value));
        }

        //default: target fitting at new spectrum.
        chooseFitTarget(this.id)
    }

    //toggle indicator
    toggleHidden('badge'+this.id)
}

function togglePlotList(id, suppressRecursion){
    //change whether a plot list is open or closed, for binding to the onclick of the subheaders
    //only allow one list open at a time.

    //close old list
    if(dataStore.openList && !suppressRecursion && id!=dataStore.openList){
        togglePlotList(dataStore.openList, true);
    }

    //allow manual close of old list
    if(id == dataStore.openList)
        dataStore.openList = null;
    else
        dataStore.openList = id;

    toggleHidden('plots'+id);
    toggleHidden('closed'+id);
    toggleHidden('open'+id);

}

function deleteAllPlots(){
    //callback to delete all button
    var deleteButtons = document.getElementsByClassName('deleteRow')

    while(deleteButtons.length > 0){
        deleteButtons[0].onclick(); //actually modifies deleteButtons in place - keep deleting zeroth element.
    }
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