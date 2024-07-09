////////////////////////////
// Analyzer Interface Viewer setup
////////////////////////////

function setupViewerContent(){
    // function to refresh the content of the Viewer subpage
    // Called when there is new content available

    // Build the content of the table from the Histogram list that was already received from the server
    buildHistosFileTable();

}


/////////////////
// helpers
/////////////////

function fetchCallback(){
    //fires after all data has been updated

    var i,
        keys = Object.keys(dataStore.viewers);

    for(i=0; i<keys.length; i++){
        dataStore.viewers[keys[i]].plotData(null, true);
    }
}

function buildHistosFileTable(){
    // Create a row in the table for each histo file in the list provided by the server
    document.getElementById("HistoFilesTable").innerHTML = '';
    document.getElementById('AnalyzerViewerDiv').innerHTML ='Click on a histogram file name below to open it in the online viewer. Select files that you wish to sum together then click the button.';

    // Add a title row to the table
    var row = document.getElementById("HistoFilesTable").insertRow(document.getElementById("HistoFilesTable").rows.length);
    row.id = 'histoFileTableRow-'+(0);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);
    var cell5 = row.insertCell(4);
    cell1.innerHTML = 'Directory: '+dataStore.histoFileDirectoryPath;
    cell2.innerHTML = '';
    cell3.innerHTML = '';
    cell4.innerHTML = '';
    cell5.innerHTML = '';
   // cell5.innerHTML = '<input type=\"checkbox\" id=\"Primary-checkbox\">';

    // Add a row for each Histo file in the list received from the server
    if(dataStore.histoFileList.length>0 && dataStore.histoFileList[0].length>3){
	for(var num=0; num<dataStore.histoFileList.length; num++){
	    var row = document.getElementById("HistoFilesTable").insertRow(document.getElementById("HistoFilesTable").rows.length);
	    row.id = 'histoFileTableRow-'+(num+1);
	    row.onclick = function(e){
		ToggleCheckboxOfThisHistoFile(this.id);
	    };

	    var cell1 = row.insertCell(0);
	    var cell2 = row.insertCell(1);
	    var cell3 = row.insertCell(2);
	    var cell4 = row.insertCell(3);
	    var cell5 = row.insertCell(4);

      var thisODBhostBackend = dataStore.ODBhostBackend.split('.')[0].split('//')[1];

	    var URLStringViewer = 'https://griffincollaboration.github.io/SpectrumViewer/spectrumViewer2.html?backend='+dataStore.spectrumServerBackend+'&port='+dataStore.spectrumServerPort+'&histoDir='+dataStore.histoFileDirectoryPath+'&histoFile='+dataStore.histoFileList[num];
	    var URLString2DViewer = 'https://griffincollaboration.github.io/SpectrumViewer/2dSpectrumTool.html?backend='+dataStore.spectrumServerBackend+'&port='+dataStore.spectrumServerPort+'&histoDir='+dataStore.histoFileDirectoryPath+'&histoFile='+dataStore.histoFileList[num];
	    var URLStringGainMatcher = 'https://griffincollaboration.github.io/SpectrumViewer/gainMatcher.html?analyzerBackend='+dataStore.spectrumServerBackend+'&analyzerPort='+dataStore.spectrumServerPort+'&ODBHostBackend='+thisODBhostBackend+'&ODBHostPort='+dataStore.ODBhostPort+'&histoDir='+dataStore.histoFileDirectoryPath+'&histoFile='+dataStore.histoFileList[num];

	    cell1.innerHTML = '<a href=\"'+URLString2DViewer+'\" target=\"_blank\">'+dataStore.histoFileList[num]+'</a>';
	    cell2.innerHTML = '<a href=\"'+URLString2DViewer+'\" target=\"_blank\">'+'Open in 2D Viewer'+'</a>';
	    cell3.innerHTML = '<a href=\"'+URLStringGainMatcher+'\" target=\"_blank\">'+'Open in GainMatcher'+'</a>';
	    cell4.innerHTML = '';

    // Create button for View Config
    newButton = document.createElement('button');
	    newButton.setAttribute('id', 'viewConfigButton'+dataStore.histoFileList[num].split('.')[0]);
    newButton.setAttribute('class', 'btn btn-default btn-sm');
    newButton.value = dataStore.histoFileList[num];
    newButton.innerHTML = "View Config";
    newButton.style.padding = '4px';
    newButton.onclick = function(){
	viewConfigOfHisto(this.value);
    }.bind(newButton);
    cell4.appendChild(newButton);

	    cell5.innerHTML = '<input type=\"checkbox\" id=\"'+dataStore.histoFileList[num]+'-checkbox'+'\" value=\"'+dataStore.histoFileList[num].trim()+'\" onclick=ToggleCheckboxOfThisHistoFile(\"histoFileTableRow-'+(num+1)+'\")>';

	}
    }else{
	// Add a single row and write a message that no hisotgram files were found.
	document.getElementById('AnalyzerViewerDiv').innerHTML ='';
	document.getElementById("HistoFilesTable").deleteRow(0);
	var row = document.getElementById("HistoFilesTable").insertRow(document.getElementById("HistoFilesTable").rows.length);
	row.id = 'histoFileTableRow-'+(num+1);
	var cell1 = row.insertCell(0);

	cell1.innerHTML = 'The directory \"'+dataStore.histoFileDirectoryPath+'\" does not contain any histogram files.';
    }

}

function ToggleCheckboxOfAllHistoFiles(state){
    // Toggle the status of the checkbox for all Histo files in the list
    if(state){ color='#2e3477'; }else{ color = '#191C40'; }
    for(var i=0; i<dataStore.histoFileList.length; i++){
	document.getElementById(dataStore.histoFileList[i]+'-checkbox').checked = state;
	document.getElementById('histoFileTableRow-'+(i+1)).style.backgroundColor = color;
    }
}

function ToggleCheckboxOfThisHistoFile(rowID){
    // Toggle the status of the checkbox for this row in the list, and highlight it
    // Works for Runs or subrun files

    var thisRowID = rowID;
    var RunID = parseInt(rowID.split('-')[1])-1;

    // Find the current state of the checkbox so we can toggle it
    thisCheckbox = document.getElementById(dataStore.histoFileList[RunID]+'-checkbox');

    // Find the state of the checkbox and toggle the state
    state = thisCheckbox.checked;
    if(state){ state=false; color = '#191C40'; }else{ state=true; color='#2e3477'; }

    // Toggle the color of the row
    document.getElementById(thisRowID).style.backgroundColor = color;

    // Toggle the state of the checkbox
    thisCheckbox.checked = state;

}

function submitHistoFileSumRequestToServer(){
    console.log('submitHistoFileSumRequestToServer');
    // Build a URL from the list of selected files and the sum histogram filename. Then submit ot the server


	// Format check for the data file
    HistoFileDirectory = dataStore.histoFileDirectoryPath;
    if(HistoFileDirectory[HistoFileDirectory.length]!='/'){
	HistoFileDirectory += '/';
    }

    var url = dataStore.spectrumServer + '/?cmd=sumHistos';
    url += '&outputfilename='+HistoFileDirectory+dataStore.histoSumFilename;

    var num=0;
	for(var i=(dataStore.histoFileList.length-1); i>=0; i--){
	    if(document.getElementById(dataStore.histoFileList[i]+'-checkbox').checked == true){
		url += '&filename'+num+'='+HistoFileDirectory+dataStore.histoFileList[i].trim();
		num++;
	    }
	}

    console.log('sumHistos, URL for analyzer server: '+url);

    if(num>1){
	// Send the request
        XHR(url,
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).',
            function(){return 0},
            function(error){console.log(error)}
           );

	// Uncheck all the files
	ToggleCheckboxOfAllHistoFiles(false);
    }else{
	// Please select at least two histogram files to sum together
	document.getElementById('alertSumModalButton').click();
    }

}

function viewConfigOfHisto(histo){
    console.log('View config of Histogram '+histo);

    // Format check for the data file
    HistoFileDirectory = dataStore.histoFileDirectoryPath;
    if(HistoFileDirectory[HistoFileDirectory.length]!='/'){
	HistoFileDirectory += '/';
    }
    filename = HistoFileDirectory + histo;

    // Change the title of the modal for displaying the content
    document.getElementById('viewConfigModalTitle').innerHTML = 'Configuration of Histogram File, ' + filename;

    // get the config file from the server/ODB for this histogram
    url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
    XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForDisplay, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function processConfigFileForDisplay(payload){

	// Unpack the response from the server into a local variable
	console.log(payload);
    var thisConfig = JSON.parse(payload);
	console.log(thisConfig);

    var content = '';

    // Unpack Directories content
    content += '<h4>Directories:</h4>';
	for(var i=0; i<thisConfig.Analyzer[5].Directories.length; i++){
	    content += '<p>' + JSON.stringify(thisConfig.Analyzer[5].Directories[i]) + '</p>';
	}

    // Unpack Midas content
    content += '<h4>Midas:</h4>';
	for(var i=0; i<thisConfig.Analyzer[6].Midas.length; i++){
	    content += '<p>' + JSON.stringify(thisConfig.Analyzer[6].Midas[i]) + '</p>';
	}

    // Unpack Global content
    content += '<h4>Globals:</h4>';
	for(var i=0; i<thisConfig.Analyzer[3].Globals.length; i++){
	    content += '<p>' + JSON.stringify(thisConfig.Analyzer[3].Globals[i]) + '</p>';
	}

    // Unpack Gate content
    content += '<h4>Gates:</h4>';
	for(var i=0; i<thisConfig.Analyzer[1].Gates.length; i++){
	    content += '<p>' + JSON.stringify(thisConfig.Analyzer[1].Gates[i]) + '</p>';
	}

    // Unpack Histogram content
    content += '<h4>Histograms:</h4>';
	for(var i=0; i<thisConfig.Analyzer[2].Histograms.length; i++){
	    content += '<p>' + JSON.stringify(thisConfig.Analyzer[2].Histograms[i]) + '</p>';
	}

    // Unpack Calibrations content
    content += '<h4>Calibrations:</h4>';
	for(var i=0; i<thisConfig.Analyzer[4].Calibrations.length; i++){
	    content += '<p>' + JSON.stringify(thisConfig.Analyzer[4].Calibrations[i]) + '</p>';
	}

    // Unpack Variables content
    content += '<h4>Sort Variables:</h4>';
	for(var i=0; i<thisConfig.Analyzer[0].Variables.length; i++){
	    content += '<p>' + JSON.stringify(thisConfig.Analyzer[0].Variables[i]) + '</p>';
	}

    // Inject the content
    document.getElementById('viewConfigModalContent').innerHTML = content;

    // Open the modal
    document.getElementById('viewConfigModalButton').click();
}
