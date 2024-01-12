////////////////////////////
// Analyzer Interface Viewer setup
////////////////////////////

function setupViewerContent(){
    
    SpectrumList = dataStore.histoFileSpectrumList;

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

    /*
    document.getElementById("Primary-checkbox").onclick = function(e){
        ToggleCheckboxOfAllHistoFiles(this.checked);
    };
*/
    
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
	    
	  //  	var URLString = 'https://griffincollaboration.github.io/SpectrumViewer/spectrumViewer2.html?backend='+urlData.backend+'&port='+urlData.port+'&histoDir='+dataStore.histoFileDirectoryPath+'&histoFile='+dataStore.histoFileList[num];
	    var URLString = 'http://localhost:1234'+'/spectrumViewer2.html?backend='+urlData.backend+'&port='+urlData.port+'&histoDir='+dataStore.histoFileDirectoryPath+'&histoFile='+dataStore.histoFileList[num];
	    
	    cell1.innerHTML = '<a href=\"'+URLString+'\" target=\"_blank\">'+dataStore.histoFileList[num]+'</a>';
	    cell2.innerHTML = '';
	    cell3.innerHTML = '';
	    cell4.innerHTML = '';
	    cell5.innerHTML = '<input type=\"checkbox\" id=\"'+dataStore.histoFileList[num]+'-checkbox'+'\" value=\"'+dataStore.histoFileList[num]+'\" onclick=ToggleCheckboxOfThisHistoFile(\"histoFileTableRow-'+(num+1)+'\")>';
	    
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
    url += '&outputfilename='+dataStore.histoSumFilename;

    var num=0;
	for(var i=0; i<dataStore.histoFileList.length; i++){
	    if(document.getElementById(dataStore.histoFileList[i]+'-checkbox').checked == true){
		url += '&filename'+num+'='+HistoFileDirectory+dataStore.histoFileList[i];
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
