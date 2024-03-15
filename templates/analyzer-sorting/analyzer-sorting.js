////////////////////////////
// Analyzer Interface Sorting setup
////////////////////////////


function setupSortingContent(){
    // function to refresh the content of the Sorting subpage
    // Called when there is new content available

    // Build the selectable list of midas files for the user
    buildMidasFileTable();

}

function prettyFileSizeString(bytes){
    // returns a string for filesize in bytes, kB, MB, GB or TBs
    var string;
    var sizeOfTB = 1000000000000;
    var sizeOfGB = 1000000000;
    var sizeOfMB = 1000000;
    var sizeOfkB = 1000;
    var sizeOfB = 1;
    if(bytes>sizeOfTB){
	// Terrabytes
	string = (bytes / sizeOfTB).toFixed(2) + ' TB';
    }
    if(bytes>sizeOfGB){
	// Terrabytes
	string = (bytes / sizeOfGB).toFixed(2) + ' GB';
    }
    else if(bytes>sizeOfMB){
	// Megabytes
	string = (bytes / sizeOfMB).toFixed(1) + ' MB';
    }
    else if(bytes>sizeOfkB){
	// kilobytes
	string = (bytes / sizeOfkB).toFixed(0) + ' kB';
    }
    else{
	// bytes
	string = bytes + ' bytes';
    }
    
    return string;
}

function prettyTimeString(seconds){
    // returns a string for Time in seconds, minutes, hours, days, weeks
    var string;
    var sizeOfWeek = 604800;
    var sizeOfDay = 86400;
    var sizeOfHour = 3600;
    var sizeOfMinute = 60;
    var sizeOfSecond = 1;

    seconds = seconds.toFixed(1);
    
    if(seconds>sizeOfWeek){
	// Weeks
	string = (seconds / sizeOfWeek).toFixed(2) + ' weeks';
    }
    else if(seconds>sizeOfDay*2){
	// Days
	string = (seconds / sizeOfDay).toFixed(2) + ' days';
    }
    else if(seconds>sizeOfHour*2){
	// Hours
	string = (seconds / sizeOfHour).toFixed(1) + ' hours';
    }
    else if(seconds>sizeOfMinute*2){
	// Minutes
	string = (seconds / sizeOfMinute).toFixed(1) + ' minutes';
    }
    else{
	// Seconds
	string = seconds + ' seconds';
    }
    
    return string;
}

function calculateAverageSortSpeed(){
    // Calling this function triggers saving the current calculated sorting speed
    if(isFinite(dataStore.SortStatusCurrentSortSpeed) && dataStore.SortStatusCurrentSortSpeed>0 && dataStore.SortStatusCurrentSortSpeed<2000){
	dataStore.SortStatusSortSpeedHistory.push(dataStore.SortStatusCurrentSortSpeed);
    }
    
    // Protect against this history getting too long (older than one minute), because the sorting speed may change over time
    if(dataStore.SortStatusSortSpeedHistory.length>60){
	var discard = dataStore.SortStatusSortSpeedHistory.shift();
    }
    
    // Calculate the average
    var arr = dataStore.SortStatusSortSpeedHistory;
    var sum=0;
    for(i=0; i<arr.length; i++){ sum += parseFloat(arr[i]); };
    const avg = (sum / arr.length) || 0;
    
    // Save the average sorting speed from all saved values
    dataStore.SortStatusAverageSortSpeed = avg.toFixed(1);

    // Update the sorting times in the table
    updateSortingTimesInTable();
}          


function buildMidasFileTable(){
// Create a row in the table for each midas file in the list provided by the server
    document.getElementById("MidFilesTable").innerHTML = '';
    
    // Add a title row to the table
    var row = document.getElementById("MidFilesTable").insertRow(document.getElementById("MidFilesTable").rows.length); 
    row.id = 'midasRunTableRow-'+(0);
     var cell1 = row.insertCell(0); 
     var cell2 = row.insertCell(1);
     var cell3 = row.insertCell(2);
     var cell4 = row.insertCell(3);
     var cell5 = row.insertCell(4);
    var cell6 = row.insertCell(5);
    // The following set the widths of the columns for the whole table
    cell1.style.width = "47.5%";
    cell2.style.width = "10.5%";
    cell3.style.width = "8.3%";
    cell4.style.width = "10.7%";
    cell5.style.width = "21.6%";
    cell6.style.width = "1.4%";
    
    // Fill in the contents of the header row
    cell1.innerHTML = '';
    cell2.innerHTML = '';
    cell3.innerHTML = '';
    cell4.innerHTML = '';
    cell5.style.textAlign = 'right';
    cell5.innerHTML = 'Select all runs:';
    cell6.innerHTML = '<input type=\"checkbox\" id=\"Primary-checkbox\">';

      document.getElementById("Primary-checkbox").onclick = function(e){
         ToggleCheckboxOfAllMIDASFiles(this.checked);
      };
    
    // Add a row for each MIDAS file in the list received from the server
 for(var num=0; num<dataStore.midasRunList.length; num++){
    var row = document.getElementById("MidFilesTable").insertRow(document.getElementById("MidFilesTable").rows.length); 
     row.id = 'midasRunTableRow-'+(num+1);
     row.onclick = function(e){
	 if(e.shiftKey) { selectMultipleRows(this.id);
	 }else{ ToggleCheckboxOfThisMIDASFile(this.id); }
     };
     
     var cell1 = row.insertCell(0); 
     var cell2 = row.insertCell(1);
     var cell3 = row.insertCell(2);
     var cell4 = row.insertCell(3);
     var cell5 = row.insertCell(4);
     var cell6 = row.insertCell(5);

     // Calculate the estimated Sorting time and make it easily human readable
     thisRunSizeString = prettyFileSizeString(dataStore.midasRunList[num].RunSize);
     
     // Calculate the estimated Sorting time and make it easily human readable
     thisSortTime = ((dataStore.midasRunList[num].RunSize/1000000)/400); // Sort speed defined here as 400MB/s - should be made dynamic
     thisSortTimeString = 'Requires '+prettyTimeString(thisSortTime)+' to sort';

     // Check if there is a Histogram file aready sorted for this MIDAS file
     var HistoIndex = dataStore.histoFileList.findIndex(function f(histoName){ return histoName.includes(dataStore.midasRunList[num].RunName); });
     
     // Update the information displayed in the cells
     let string = dataStore.midasRunList[num].RunName;
     if(dataStore.midasRunList[num].RunTitle.length>0){ string += ', '+dataStore.midasRunList[num].RunTitle; }
     cell1.innerHTML = string;
    cell2.innerHTML = dataStore.midasRunList[num].NumSubruns+' subruns';
    cell2.id = 'MidasSubrunDiv-'+(num+1);
     cell3.innerHTML = thisRunSizeString;
     cell3.value = dataStore.midasRunList[num].RunSize; // Use this hidden value in bytes when updating the sorting time.
     if(HistoIndex>=0){
	 // If there is a histogram file existing or this run, then put a link for it here
	 var URLString = 'https://griffincollaboration.github.io/SpectrumViewer/spectrumViewer2.html?backend='+dataStore.spectrumServerBackend+'&port='+dataStore.spectrumServerPort+'&histoDir='+dataStore.histoFileDirectoryPath+'&histoFile='+dataStore.histoFileList[HistoIndex];
	    
	    cell4.innerHTML = '<a href=\"'+URLString+'\" target=\"_blank\">Open Histo file</a>';
 }
     cell5.innerHTML = thisSortTimeString;
    cell6.innerHTML = '<input type=\"checkbox\" id=\"'+dataStore.midasRunList[num].RunName+'-checkbox'+'\" value=\"'+dataStore.midasRunList[num].RunName+'\" onclick=ToggleCheckboxOfThisMIDASFile(\"midasRunTableRow-'+(num+1)+'\")>';

     // Create button to expand list of subruns if there is more than 1 subrun
     if(dataStore.midasRunList[num].NumSubruns>1){
	 newButton = document.createElement('button');
	 newButton.setAttribute('id', 'expandSubrunListButton'+(num+1)); 
	 newButton.setAttribute('class', 'btn-expand');
	 newButton.innerHTML = '<p>+</p>';
	 newButton.value = (num+1);
	 newButton.onclick = function(){
	     expandSubrunList(this.value);
	 }.bind(newButton);
	 document.getElementById('MidasSubrunDiv-'+(num+1)).appendChild(newButton);
     }
  }
    
}

function addFileDetailsToMidasFileTable(){
    var table = document.getElementById("MidFilesTable");
    
    // Iterate through all rows of the MIDAS data file table
    for (var i = 1, row; row = table.rows[i]; i++) {
	// Get the run number from cell0
	thisRunName = row.cells[0].innerHTML;
	
	// Find the details for this run
	num = dataStore.midasRunList.map(function(e) { return e.RunName; }).indexOf(thisRunName);
	
	// Find the run title and update the contents of cell0
	let string = thisRunName + ', ' + dataStore.midasRunList[num].RunTitle;
	row.cells[0].innerHTML = string;
    }
    
}

function updateSortingTimesInTable(){
    var table = document.getElementById("MidFilesTable");
    var SortSpeedNow = dataStore.SortStatusAverageSortSpeed;
    
    // Iterate through all rows of the MIDAS data file table
    for (var i = 1, row; row = table.rows[i]; i++) {
	// Get the file size from cell3
	thisRunSize = row.cells[2].value;
	
	// Calculate the estimated Sorting time based on the latest Average sorting speed and make it easily human readable
	thisSortTime = ((thisRunSize/1000000)/SortSpeedNow);
	thisSortTimeString = 'Requires '+prettyTimeString(thisSortTime)+' to sort';
	
	// Update the sorting time displayed
	row.cells[4].innerHTML = thisSortTimeString;
    }
    
}

function expandSubrunList(RowID){

    // Define the index number and current position in the table from the RowID
    // RowID is equal to the original rowIndex when the table was built, but rows may have been added or removed since then.
    var indexID = (parseInt(RowID)-1);
    var subRowID = document.getElementById('midasRunTableRow-'+RowID).rowIndex + 1;

    // Indicate that this list of subruns has been expanded
    // This is used to know to check these subruns when the submit button is pressed
    dataStore.midasRunList[indexID].Expanded = true;

    // Remove the Expand button
    document.getElementById('expandSubrunListButton'+RowID).remove();

    // Inject the collapse button
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'collapseSubrunListButton'+RowID); 
    newButton.setAttribute('class', 'btn-expand');
    newButton.innerHTML = '<p>-</p>';
    newButton.value = RowID;
    newButton.onclick = function(){
	collapseSubrunList(this.value);
    }.bind(newButton);
    document.getElementById('MidasSubrunDiv-'+RowID).appendChild(newButton);
    
    // Uncheck the full run
    ToggleCheckboxOfThisMIDASFile('midasRunTableRow-'+RowID);
    
    for(var num=0; num<(dataStore.midasRunList[indexID].SubRunList.length); num++){
	var row = document.getElementById("MidFilesTable").insertRow(subRowID); 
     row.id = 'midasSubRunTableRow-'+RowID+'-'+(num+1);
     row.onclick = function(e){
	 if(e.shiftKey) { selectMultipleRows(this.id);
	 }else{ ToggleCheckboxOfThisMIDASFile(this.id); }
     };
     
     var cell1 = row.insertCell(0); 
     var cell2 = row.insertCell(1);
     var cell3 = row.insertCell(2);
     var cell4 = row.insertCell(3);
     var cell5 = row.insertCell(4);
     var cell6 = row.insertCell(5);

     // Calculate the estimated Sorting time and make it easily human readable
     thisRunSizeString = prettyFileSizeString(dataStore.midasRunList[indexID].SubRunList[num].Size);
     
     // Calculate the estimated Sorting time and make it easily human readable
     thisSortTime = ((dataStore.midasRunList[indexID].SubRunList[num].Size/1000000)/400); // Sort speed defined here as 400MB/s - should be made dynamic
     thisSortTimeString = 'Requires '+prettyTimeString(thisSortTime)+' to sort';
     
    cell1.innerHTML = dataStore.midasRunList[indexID].SubRunList[num].Name;
	cell2.innerHTML = 'Subrun '+dataStore.midasRunList[indexID].SubRunList[num].Name.split('_')[1].split('.')[0];
    cell3.innerHTML = thisRunSizeString;
    cell4.innerHTML = '';
    cell5.innerHTML = thisSortTimeString;
    cell6.innerHTML = '<input type=\"checkbox\" id=\"'+dataStore.midasRunList[indexID].SubRunList[num].Name+'-checkbox'+'\" value=\"'+dataStore.midasRunList[indexID].SubRunList[num].Name+'\" onclick=ToggleCheckboxOfThisMIDASFile(\"midasSubRunTableRow-'+RowID+'-'+(num+1)+'\")>';
    }
    
}


function collapseSubrunList(RowID){
    // Define the index number and current position in the table from the RowID
    // RowID is equal to the original rowIndex when the table was built, but rows may have been added or removed since then.
    var indexID = (parseInt(RowID)-1);
    var subRowID = document.getElementById('midasRunTableRow-'+RowID).rowIndex + 1;
    
    // Remove the collapse button
    document.getElementById('collapseSubrunListButton'+RowID).remove();

    // Create button to expand list of subruns if there is more than 1 subrun
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'expandSubrunListButton'+RowID); 
    newButton.setAttribute('class', 'btn-expand');
    newButton.innerHTML = '<p>+</p>';
    newButton.value = RowID;
    newButton.onclick = function(){
	expandSubrunList(this.value);
    }.bind(newButton);
    document.getElementById('MidasSubrunDiv-'+RowID).appendChild(newButton);
    
    // delete the subrun rows
    for(var num=0; num<(dataStore.midasRunList[indexID].SubRunList.length); num++){
	thisSubRowId = 'midasSubRunTableRow-'+RowID+'-'+(num+1);
	let row = document.getElementById(thisSubRowId);
	row.parentNode.removeChild(row);
    }

    // Uncheck the full run
    ToggleCheckboxOfThisMIDASFile('midasRunTableRow-'+RowID);
    
}

function ToggleCheckboxOfAllMIDASFiles(state){
    // Toggle the status of the checkbox for all MIDAS files in the list
    if(state){ color='#2e3477'; }else{ color = '#191C40'; }
 for(var i=0; i<dataStore.midasRunList.length; i++){
     document.getElementById(dataStore.midasRunList[i].RunName+'-checkbox').checked = state;
     document.getElementById('midasRunTableRow-'+(i+1)).style.backgroundColor = color;
 }
}

function UncheckAllSubruns(){
	for(var i=0; i<dataStore.midasRunList.length; i++){
	   if(dataStore.midasRunList[i].Expanded){
		for(var j=0; j<dataStore.midasRunList[i].SubRunList.length; j++){
		    if(document.getElementById(dataStore.midasRunList[i].SubRunList[j].Name+'-checkbox').checked == true){
			document.getElementById(dataStore.midasRunList[i].SubRunList[j].Name+'-checkbox').click();
		    }
		}
	    }
	}
}

function ToggleCheckboxOfThisMIDASFile(rowID){
    // Toggle the status of the checkbox for this row in the list, and highlight it
    // Works for Runs or subrun files
    // Called as the onclick event for rows or checkboxes in the midasFileTable

    var thisRowID = rowID;
    var RunID = parseInt(rowID.split('-')[1])-1;
    dataStore.midasTableLastRowClicked = rowID;
    
    if(rowID.includes('Sub')){
	subRunID = (rowID.split('-')[2])-1;
	// Find the current state of the checkbox and then toggle it
	thisCheckbox = document.getElementById(dataStore.midasRunList[RunID].SubRunList[subRunID].Name+'-checkbox');
	
    }else{
	// Find the current state of the checkbox so we can toggle it
	thisCheckbox = document.getElementById(dataStore.midasRunList[RunID].RunName+'-checkbox');
    }

    // Find the state of the checkbox and toggle the state
    state = thisCheckbox.checked;
    if(state){ state=false; color = '#191C40'; }else{ state=true; color='#2e3477'; }
    
    // Toggle the color of the row
    document.getElementById(thisRowID).style.backgroundColor = color;

    // Toggle the state of the checkbox
    thisCheckbox.checked = state;

}

function selectMultipleRows(thisRowID){
    // called on shiftclick of rows in the midas data file table

    var firstRowID = dataStore.midasTableLastRowClicked;

    if(parseInt(thisRowID.split('-')[1])<parseInt(firstRowID.split('-')[1])){ firstRowID = thisRowID; thisRowID = dataStore.midasTableLastRowClicked; }
    console.log('Clicked rows are '+firstRowID.split('-')[1]+' and '+thisRowID.split('-')[1]);
    console.log('Clicked rows are '+firstRowID+' and '+thisRowID);
    
    var table = document.getElementById("MidFilesTable");
    
    // Iterate through all rows of the MIDAS data file table and click those between the two identified rows
    var toggleThis = false;
    for (var i = 1, row; row = table.rows[i]; i++) {
	// if toggling is active then toggle this row
	if(toggleThis){
	    console.log(row.id);
	    ToggleCheckboxOfThisMIDASFile(row.id);
	}
	
	// Find the first row id and then activate toggling
	if(row.id == firstRowID){
	    toggleThis = true;
	}

	// Find the last row id, deactivate toggling and exit
	if(row.id == thisRowID){
	    toggleThis = false;
	    return;
	}
    }
    
}

    function SubmitSelectedFilesFromTableToSortQueue(){
    // First build the list of selected files to sort
    // Then submit the files to the server as a series of XHR URL requests

	// Build list of urls for the selected files
	//var DataFileDirectory = '/tig/grifstore1b/grifalt/schedule145/Dec2023/';
	var DataFileDirectory = dataStore.midasFileDataDirectoryPath;
	var HistoFileDirectory = dataStore.histoFileDirectoryPath;
	var CalibrationSource = dataStore.CalibrationSource;

	// Format check for the data file
	
	if(DataFileDirectory[DataFileDirectory.length]!='/'){
	    DataFileDirectory += '/';
	}

	var urls = [];
	for(var i=0; i<dataStore.midasRunList.length; i++){
	    if(document.getElementById(dataStore.midasRunList[i].RunName+'-checkbox').checked == true){
		urls[urls.length] = dataStore.spectrumServer + '?cmd=addDatafile&filename='+DataFileDirectory+dataStore.midasRunList[i].RunName+'&histodir=' + HistoFileDirectory +'&configdir=' + dataStore.configFileDataDirectoryPath + '&calibrationSource=' + CalibrationSource;
	    }else if(dataStore.midasRunList[i].Expanded){
		// If the list of subruns for this Run was expanded in the table then check if any are checked for sorting
		for(var j=0; j<dataStore.midasRunList[i].SubRunList.length; j++){
		    if(document.getElementById(dataStore.midasRunList[i].SubRunList[j].Name+'-checkbox').checked == true){
			urls[urls.length] = dataStore.spectrumServer + '?cmd=addDatafile&filename='+DataFileDirectory+dataStore.midasRunList[i].SubRunList[j].Name+'&histodir=' + HistoFileDirectory +'&configdir=' + dataStore.configFileDataDirectoryPath + '&calibrationSource=' + CalibrationSource;
		    }
		}
	    }
	}
	
    // Submit a sort job to the analyzer server for each selected file
    //urls[0] = dataStore.spectrumServer + '?cmd=addDatafile&filename=/tig/grifstore1b/grifalt/schedule145/Dec2023/run21758_000.mid';
	for(i=0; i<urls.length; i++){
        XHR(urls[i], 
            'check ODB - file submit rejected.', 
            function(){return 0},
            function(error){console.log(error)}
        )
	}

	// Uncheck all the files
	ToggleCheckboxOfAllMIDASFiles(false);
	UncheckAllSubruns();
	
    }
