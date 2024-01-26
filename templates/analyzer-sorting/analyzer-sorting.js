////////////////////////////
// Analyzer Interface Sorting setup
////////////////////////////

function updateSortStatus(){
    // use a one-off XHR request with callback for getting the initial sort status. THIS SHOULD GO INTO A HEARTBEAT.
    url = dataStore.spectrumServer + '/?cmd=getSortStatus';
    XHR(url, "Problem getting Sort Status from analyzer server", processSortStatus, function(error){ErrorConnectingToAnalyzerServer(error)});
}

function initiateSortStatusHeartbeat(){
    // initiate heartbeat for the Sort Status
    var url = dataStore.spectrumServer + '/?cmd=getSortStatus'
    heartbeatXHR(url, "Problem getting Sort Status from analyzer server", processSortStatus, ErrorConnectingToAnalyzerServer);
}

function processSortStatus(payload){
    //
    // The function in the analyzer server (c syntax)  
    //int send_sort_status(int fd)
    //{
    //   char tmp[256];
    //   sprintf(tmp,"%d %d %ld %ld", current_run, current_subrun, current_filesize, midas_bytes);
    //   put_line(fd, tmp, strlen(tmp) );
    //   return(0);
    // }
    //
   // dataStore.SortStatusHistory.push(payload);
  //  console.log(dataStore.SortStatusHistory);
    // Handle the Analyzer IDLE response
    // Set the progress bar to orange and write a status message
    if(strncmp(payload,'IDLE',4)){
	// Set the heartbeat frequency
	dataStore.heartbeatInterval = 5000;
	
	// Update the progress bar
	document.getElementById('progress').className = 'progress-bar progress-bar-warning progress-bar-striped';
	document.getElementById('progress').setAttribute('style', 'width:' + 100 + '%' );
	document.getElementById('progress').innerHTML = 'Analyzer is idle, ready for files to be submitted.';
	document.getElementById("SortingStatus").innerHTML = 'Analyzer is idle, ready for files to be submitted.';
	return;
    }else{
	// Set the heartbeat frequency
	dataStore.heartbeatInterval = 1000;
    }
    
    // Handle the Analyzer running response
    // [Data Directory] [Filename] [Run number] [Subrun number] [File size in bytes] [bytes sorted]
    // The above line repeats for all files in the current queue

    // Timestamp this Sort Status (in seconds)
    dataStore.SortStatusCurrentTimestamp = Math.floor(Date.now() / 1000);

    // Unpack the Sort Status response from the server
    var thisPayload = payload.split(" ");
    dataStore.midasFileDataDirectoryPath = thisPayload[0];
    dataStore.SortStatusCurrentFileName = thisPayload[1];
    dataStore.SortStatusCurrentRunNumber = parseInt(thisPayload[2]);
    dataStore.SortStatusCurrentSubRunNumber = parseInt(thisPayload[3]);
    dataStore.SortStatusCurrentBytesFileSize = parseInt(thisPayload[4]);
    dataStore.SortStatusCurrentFileSize = parseInt(thisPayload[4] / 1000000);
    dataStore.SortStatusCurrentBytesSorted = parseInt(thisPayload[5]);
    dataStore.SortStatusCurrentMegaBytesSorted = parseInt(thisPayload[5] / 1000000);

    // Skip the first update so that we can have valid sort speed values
    if(dataStore.SortStatusPreviousTimestamp<100){
	dataStore.SortStatusPreviousTimestamp = dataStore.SortStatusCurrentTimestamp;
	dataStore.SortStatusPreviousBytesSorted = dataStore.SortStatusCurrentBytesSorted;
	dataStore.SortStatusPreviousMegaBytesSorted = dataStore.SortStatusCurrentMegaBytesSorted;
    }

    // Calculate quantities from the current Sort Status values
    dataStore.SortStatusCurrentSortSpeed = parseFloat((dataStore.SortStatusCurrentMegaBytesSorted-dataStore.SortStatusPreviousMegaBytesSorted)/(dataStore.SortStatusCurrentTimestamp - dataStore.SortStatusPreviousTimestamp)).toFixed(1);
    calculateAverageSortSpeed();
    dataStore.SortStatusCurrentPercentageComplete = parseFloat((dataStore.SortStatusCurrentMegaBytesSorted/dataStore.SortStatusCurrentFileSize)*100.0).toFixed(1);
    dataStore.SortStatusCurrentRemainingSortTime = parseFloat((dataStore.SortStatusCurrentFileSize-dataStore.SortStatusCurrentMegaBytesSorted)/dataStore.SortStatusCurrentSortSpeed).toFixed(1);

    /*
    console.log('===================================');
    console.log(dataStore.SortStatusCurrentTimestamp);
    console.log(dataStore.SortStatusSortSpeedHistory);
    console.log(dataStore.SortStatusCurrentSortSpeed);
    console.log(dataStore.SortStatusAverageSortSpeed);
    */
    
    // Protect against nonsense values, but also against divide by zero errors
    if(dataStore.SortStatusCurrentSortSpeed<0){ dataStore.SortStatusCurrentSortSpeed=0.1; }
    if(!dataStore.SortStatusCurrentSortSpeed){ dataStore.SortStatusCurrentSortSpeed=0.1; }
    if(dataStore.SortStatusCurrentPercentageComplete<0){ dataStore.SortStatusCurrentPercentageComplete=0.1; }
    if(dataStore.SortStatusCurrentRemainingSortTime<0){ dataStore.SortStatusCurrentRemainingSortTime=0.1; }

    // Check the values in the console
    /*
    console.log('Dir: '+dataStore.midasFileDataDirectoryPath);
    console.log('File: '+dataStore.SortStatusCurrentFileName);
    console.log('Run: '+dataStore.SortStatusCurrentRunNumber);
    console.log('Sub: '+dataStore.SortStatusCurrentSubRunNumber);
    console.log('Size: '+dataStore.SortStatusCurrentFileSize+' MB');
    console.log('Sorted: '+dataStore.SortStatusCurrentBytesSorted+' Bytes');
    console.log('Sorted: '+dataStore.SortStatusCurrentMegaBytesSorted+' MB');
    console.log('Percent: '+dataStore.SortStatusCurrentPercentageComplete);
    console.log('Current Speed: '+dataStore.SortStatusCurrentSortSpeed);
    console.log('Average Speed: '+dataStore.SortStatusAverageSortSpeed);
    console.log('Remaining: '+dataStore.SortStatusCurrentRemainingSortTime);
    */

    // Update the printed Sort Status information on screen
   // string = 'Sorting Run '+dataStore.SortStatusCurrentRunNumber+', subrun '+dataStore.SortStatusCurrentSubRunNumber+' at '+dataStore.SortStatusAverageSortSpeed+' MB/s. Sorted '+dataStore.SortStatusCurrentMegaBytesSorted+' of '+dataStore.SortStatusCurrentFileSize+' MBs ('+dataStore.SortStatusCurrentPercentageComplete+'% completed). Estimated time to complete = '+dataStore.SortStatusCurrentRemainingSortTime+' s.';
    string = 'Sorting Run '+dataStore.SortStatusCurrentRunNumber+', subrun '+dataStore.SortStatusCurrentSubRunNumber+' at '+dataStore.SortStatusAverageSortSpeed+' MB/s. Sorted '+prettyFileSizeString(dataStore.SortStatusCurrentBytesSorted)+' of '+prettyFileSizeString(dataStore.SortStatusCurrentBytesFileSize)+'s ('+dataStore.SortStatusCurrentPercentageComplete+'% completed). Estimated time to complete = '+dataStore.SortStatusCurrentRemainingSortTime+' s.';
    document.getElementById("SortingStatus").innerHTML = string;

    // Update the progress bar to show the current sort progress
    if(document.getElementById('progress').className == 'progress-bar progress-bar-warning progress-bar-striped'){
	document.getElementById('progress').className = 'progress-bar progress-bar-success progress-bar-striped';
    }
    document.getElementById('progress').setAttribute('style', 'width:' + dataStore.SortStatusCurrentPercentageComplete + '%' );
    document.getElementById('progress').innerHTML = dataStore.SortStatusCurrentPercentageComplete+'% Completed';

    // Save the timestamp and bytes sorted for use at the next update
    dataStore.SortStatusPreviousTimestamp = dataStore.SortStatusCurrentTimestamp;
    dataStore.SortStatusPreviousMegaBytesSorted = dataStore.SortStatusCurrentMegaBytesSorted;

    // Update the Sort queue table
    var thisPayloadArray = payload.split(",");
    document.getElementById("JobsQueue").innerHTML = '';
    var totalQueueFileSize = 0;
    for(i=0; i<thisPayloadArray.length-1; i++){
	var thisPayload = thisPayloadArray[i].split(" ");
	if(i>0){
	    document.getElementById("JobsQueue").innerHTML += '<br>'+thisPayload[1]+' ('+prettyFileSizeString(thisPayload[4])+', requires '+prettyTimeString(parseInt(thisPayload[4] / 1000000)/dataStore.SortStatusAverageSortSpeed)+' to sort)';
	    totalQueueFileSize += parseInt(thisPayload[4]);
	}else{
	    document.getElementById("JobsQueue").innerHTML += thisPayload[1]+' ('+prettyFileSizeString(thisPayload[4])+', requires '+prettyTimeString(parseInt(thisPayload[4] / 1000000)/dataStore.SortStatusAverageSortSpeed)+' to sort)';
	}
    }
    if(totalQueueFileSize>0){
   // document.getElementById("JobsQueue").innerHTML += '<br>Time to sort entire queue is '+parseFloat(totalQueueFileSize/dataStore.SortStatusAverageSortSpeed).toFixed(1)+' seconds';
	document.getElementById("JobsQueue").innerHTML += '<br>Time to sort entire queue of ('+prettyFileSizeString(totalQueueFileSize)+') is '+prettyTimeString((totalQueueFileSize/1000000)/dataStore.SortStatusAverageSortSpeed);
    }
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

function getMidasFileListFromServer(){

    // use a one-off XHR request with callback for getting the list of MIDAS files
    url = dataStore.spectrumServer + '/?cmd=getDatafileList&dir='+dataStore.midasFileDataDirectoryPath;
    XHR(url, "Problem getting list of MIDAS files from analyzer server", processMidasFileList, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function getHistoFileListFromServer(){

    // use a one-off XHR request with callback for getting the list of Histo files
    url = dataStore.spectrumServer + '/?cmd=getHistofileList&dir='+dataStore.histoFileDirectoryPath;
    XHR(url, "Problem getting list of Histogram files from analyzer server", processHistoFileList, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function processMidasFileList(payload){

    // receive the payload and split into an array of strings
    var thisPayload = payload.split("]")[0].split("[ \n")[1];
    
    // tidy up the strings to extract the list of midas files
    var thisPayloadList = thisPayload.split(" , \n ");

    // Declare a local object to unpack the list and then sort it
    var thisMidasFileList = [
   	                     { "Names" : 'name', "Sizes" : 5000000 }
                            ];
    
    for(var i=0; i<thisPayloadList.length; i++){
	thisMidasFileList[i] = {
	    "Names" : thisPayloadList[i].split(" , ")[0],
	    "Sizes" : parseInt(thisPayloadList[i].split(" , ")[1])
	}
    }

    // Sort the list in reverse numberical and alphabetical order so the newer files appear first
    thisMidasFileList.sort((a,b) => (a.Names < b.Names) ? 1 : ((b.Names < a.Names) ? -1 : 0));

    // Save this list of midas files to the dataStore
    dataStore.midasFileList = thisMidasFileList;

    // Declare this object structure
    var thisMidasRunList = [{
	    "RunName" : '',
	    "RunSize" : 0,
	    "Expanded" : false,
	"SubRunList" : [{
	                "Name" : '',
	                "Size" : 0,
	               }]
    }];

    i=0;
    j=0;
    num=-1;
    while(i<thisMidasFileList.length){
        // Check if this is a newly encoutered Run number
	thisRunName = thisMidasFileList[i].Names.split("_")[0];
	if(i==0 || (thisRunName != thisMidasFileList[i-1].Names.split("_")[0])){
	    num++;
	    j=0;
	    thisMidasRunList[num] = {
	    "RunName" : '',
	    "NumSubruns" : 0,
	    "RunSize" : 0,
	    "Expanded" : false,
	"SubRunList" : []
          };
	    thisMidasRunList[num].RunName = thisRunName;
	    thisMidasRunList[num].RunSize = 0;
	}
	thisMidasRunList[num].RunSize = (thisMidasRunList[num].RunSize + thisMidasFileList[i].Sizes);
	thisMidasRunList[num].NumSubruns++;
	thisSubRunList = {
	    "Name" : thisMidasFileList[i].Names,
	    "Size" : thisMidasFileList[i].Sizes
	}
	thisMidasRunList[num].SubRunList.push(thisSubRunList);
	i++;
	j++;
	}

    // Save this object to the dataStore
    dataStore.midasRunList = thisMidasRunList;
    
    // Build the selectable list of midas files for the user
    buildMidasFileTable();
}

function processHistoFileList(payload){
    
    // receive the payload and split into an array of strings
    var thisPayload = payload.split("]")[0].split("[ \n")[1];
    
    // tidy up the strings to extract the list of midas files
    dataStore.histoFileList = thisPayload.split(" , \n ");

    // Sort the list in numberical and alphabetical order, then reverse the order so the newer files appear first (note this is not ideal for sub-runs)
    dataStore.histoFileList.sort();
    dataStore.histoFileList.reverse();

}

function buildMidasFileTable(){
// Create a row in the table for each midas file in the list provided by the server
    document.getElementById("MidFilesTable").innerHTML = '';
    console.log(dataStore.histoFileList);
    
    // Add a title row to the table
    var row = document.getElementById("MidFilesTable").insertRow(document.getElementById("MidFilesTable").rows.length); 
    row.id = 'midasRunTableRow-'+(0);
     var cell1 = row.insertCell(0); 
     var cell2 = row.insertCell(1);
     var cell3 = row.insertCell(2);
     var cell4 = row.insertCell(3);
     var cell5 = row.insertCell(4);
     var cell6 = row.insertCell(5);
    cell1.innerHTML = '';
    cell2.innerHTML = '';
    cell3.innerHTML = '';
    cell4.innerHTML = '';
    cell5.innerHTML = '';
    cell6.innerHTML = '<input type=\"checkbox\" id=\"Primary-checkbox\">';

      document.getElementById("Primary-checkbox").onclick = function(e){
         ToggleCheckboxOfAllMIDASFiles(this.checked);
      };
    
    // Add a row for each MIDAS file in the list received from the server
 for(var num=0; num<dataStore.midasRunList.length; num++){
    var row = document.getElementById("MidFilesTable").insertRow(document.getElementById("MidFilesTable").rows.length); 
     row.id = 'midasRunTableRow-'+(num+1);
     row.onclick = function(e){
         ToggleCheckboxOfThisMIDASFile(this.id);
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
     console.log('HistoIndex='+HistoIndex+' for '+dataStore.midasRunList[num].RunName);
     
     // Update the information displayed in the cells
    cell1.innerHTML = dataStore.midasRunList[num].RunName;
    cell2.innerHTML = dataStore.midasRunList[num].NumSubruns+' subruns';
    cell2.id = 'MidasSubrunDiv-'+(num+1);
     cell3.innerHTML = thisRunSizeString;
     cell3.value = dataStore.midasRunList[num].RunSize; // Use this hidden value in bytes when updating the sorting time.
     if(HistoIndex>=0){
	 // If there is a histogram file existing or this run, then put a link for it here
	 var URLString = 'https://griffincollaboration.github.io/SpectrumViewer/spectrumViewer2.html?backend='+urlData.backend+'&port='+urlData.port+'&histoDir='+dataStore.histoFileDirectoryPath+'&histoFile='+dataStore.histoFileList[HistoIndex];
	    
	    cell4.innerHTML = '<a href=\"'+URLString+'\" target=\"_blank\">Open Histo file</a>';
 }
     cell5.innerHTML = thisSortTimeString;
    cell6.innerHTML = '<input type=\"checkbox\" id=\"'+dataStore.midasRunList[num].RunName+'-checkbox'+'\" value=\"'+dataStore.midasRunList[num].RunName+'\" onclick=ToggleCheckboxOfThisMIDASFile(\"midasRunTableRow-'+(num+1)+'\")>';

    // Create button to expand list of subruns
    newButton = document.createElement('button'); 
     newButton.setAttribute('id', 'expandSubrunListButton'+(num+1)); 
    newButton.setAttribute('class', 'btn btn-default btn-xs'); 
    newButton.innerHTML = "Show all";
     newButton.style.padding = '4px';
     newButton.value = (num+1);
    newButton.onclick = function(){
	expandSubrunList(this.value);
    }.bind(newButton);
    document.getElementById('MidasSubrunDiv-'+(num+1)).appendChild(newButton);
  }
    
}

function updateSortingTimesInTable(){
    var table = document.getElementById("MidFilesTable");
    var SortSpeedNow = dataStore.SortStatusAverageSortSpeed;
    
    // Iterate through all rows of the MIDAS data file table
    for (var i = 1, row; row = table.rows[i]; i++) {
	// Get the file size from cell4
	thisRunSize = row.cells[2].value;
	
	// Calculate the estimated Sorting time based on the latest Average sorting speed and make it easily human readable
	thisSortTime = ((thisRunSize/1000000)/SortSpeedNow); // Sort speed defined here as 400MB/s - should be made dynamic
	thisSortTimeString = 'Requires '+prettyTimeString(thisSortTime)+' to sort';
	
	// Update the sorting time displayed
	row.cells[3].innerHTML = thisSortTimeString;
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

    // Uncheck the full run
    ToggleCheckboxOfThisMIDASFile('midasRunTableRow-'+RowID);
    
    for(var num=0; num<(dataStore.midasRunList[indexID].SubRunList.length); num++){
	var row = document.getElementById("MidFilesTable").insertRow(subRowID); 
     row.id = 'midasSubRunTableRow-'+RowID+'-'+(num+1);
     row.onclick = function(e){
         ToggleCheckboxOfThisMIDASFile(this.id);
     };
     
     var cell1 = row.insertCell(0); 
     var cell2 = row.insertCell(1);
     var cell3 = row.insertCell(2);
     var cell4 = row.insertCell(3);
     var cell5 = row.insertCell(4);
     var cell6 = row.insertCell(5);

	// Calculate the estimated Sorting time and make it easily human readable
	thisRunSize = dataStore.midasRunList[indexID].SubRunList[num].Size/1000000; // in MB
	if(thisRunSize<1000){
	    thisRunSizeString = thisRunSize.toFixed(1)+' MB';
	}else{
	    thisRunSizeString = (thisRunSize/1000).toFixed(1)+' GB';
	}
	// Calculate the estimated Sorting time and make it easily human readable
	thisSortTime = (thisRunSize/200).toFixed(1); // Sort speed defined here as 200MB/s - should be made dynamic
	if(thisSortTime<60){
	    thisSortTimeString = 'Requires '+thisSortTime+' seconds to sort';
	}else{
	    thisSortTimeString = 'Requires '+(thisSortTime/60.0).toFixed(1)+' minutes to sort';
	}
     
    cell1.innerHTML = '';
    cell2.innerHTML = dataStore.midasRunList[indexID].SubRunList[num].Name;
    cell3.innerHTML = thisRunSizeString;
    cell4.innerHTML = '';
    cell5.innerHTML = thisSortTimeString;
    cell6.innerHTML = '<input type=\"checkbox\" id=\"'+dataStore.midasRunList[indexID].SubRunList[num].Name+'-checkbox'+'\" value=\"'+dataStore.midasRunList[indexID].SubRunList[num].Name+'\" onclick=ToggleCheckboxOfThisMIDASFile(\"midasSubRunTableRow-'+RowID+'-'+(num+1)+'\")>';
    }
    
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

    var thisRowID = rowID;
    var RunID = parseInt(rowID.split('-')[1])-1;
    
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

    function SubmitSelectedFilesFromTableToSortQueue(){
    // First build the list of selected files to sort
    // Then submit the files to the server as a series of XHR URL requests

	// Build list of urls for the selected files
	//var DataFileDirectory = '/tig/grifstore1b/grifalt/schedule145/Dec2023/';
	var DataFileDirectory = dataStore.midasFileDataDirectoryPath;
	var HistoFileDirectory = dataStore.histoFileDirectoryPath;

	// Format check for the data file
	
	if(DataFileDirectory[DataFileDirectory.length]!='/'){
	    DataFileDirectory += '/';
	}

	var urls = [];
	for(var i=0; i<dataStore.midasRunList.length; i++){
	    if(document.getElementById(dataStore.midasRunList[i].RunName+'-checkbox').checked == true){
		urls[urls.length] = dataStore.spectrumServer + '?cmd=addDatafile&filename='+DataFileDirectory+dataStore.midasRunList[i].RunName+'&histodir=' + HistoFileDirectory;
	    }else if(dataStore.midasRunList[i].Expanded){
		// If the list of subruns for this Run was expanded in the table then check if any are checked for sorting
		for(var j=0; j<dataStore.midasRunList[i].SubRunList.length; j++){
		    if(document.getElementById(dataStore.midasRunList[i].SubRunList[j].Name+'-checkbox').checked == true){
			urls[urls.length] = dataStore.spectrumServer + '?cmd=addDatafile&filename='+DataFileDirectory+dataStore.midasRunList[i].SubRunList[j].Name+'&histodir=' + HistoFileDirectory;
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
