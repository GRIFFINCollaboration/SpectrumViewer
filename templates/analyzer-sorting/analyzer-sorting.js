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

    // Handle the Analyzer IDLE response
    // Set the progress bar to orange and write a status message
    if(strncmp(payload,'IDLE',4)){
	
	// Update the progress bar
	document.getElementById('progress').className = 'progress-bar progress-bar-warning progress-bar-striped';
	document.getElementById('progress').setAttribute('style', 'width:' + 100 + '%' );
	document.getElementById('progress').innerHTML = 'Analyzer is idle, ready for files to be submitted.';
	document.getElementById("SortingStatus").innerHTML = 'Analyzer is idle, ready for files to be submitted.';
	return;
    }

    // Handle the Analyzer running response
    // [Data Directory] [Filename] [Run number] [Subrun number] [File size in bytes] [bytes sorted]

    // Timestamp this Sort Status (in seconds)
    dataStore.SortStatusCurrentTimestamp = Math.floor(Date.now() / 1000);

    // Unpack the Sort Status response from the server
    var thisPayload = payload.split(" ");
    dataStore.midasFileDataDirectoryPath = thisPayload[0];
    dataStore.SortStatusCurrentFileName = thisPayload[1];
    dataStore.SortStatusCurrentRunNumber = parseInt(thisPayload[2]);
    dataStore.SortStatusCurrentSubRunNumber = parseInt(thisPayload[3]);
    dataStore.SortStatusCurrentFileSize = parseInt(thisPayload[4] / 1000000);
    dataStore.SortStatusCurrentMegaBytesSorted = parseInt(thisPayload[5] / 1000000);

    // Skip the first update so that we can have valid sort speed values
    if(dataStore.SortStatusPreviousTimestamp<100){
	dataStore.SortStatusPreviousTimestamp = dataStore.SortStatusCurrentTimestamp;
	dataStore.SortStatusPreviousMegaBytesSorted = dataStore.SortStatusCurrentMegaBytesSorted;
    }

    // Calculate quantities from the current Sort Status values
    dataStore.SortStatusCurrentSortSpeed = parseFloat((dataStore.SortStatusCurrentMegaBytesSorted-dataStore.SortStatusPreviousMegaBytesSorted)/(dataStore.SortStatusCurrentTimestamp - dataStore.SortStatusPreviousTimestamp)).toFixed(1);
    dataStore.SortStatusCurrentPercentageComplete = parseFloat((dataStore.SortStatusCurrentMegaBytesSorted/dataStore.SortStatusCurrentFileSize)*100.0).toFixed(1);
    dataStore.SortStatusCurrentRemainingSortTime = parseFloat((dataStore.SortStatusCurrentFileSize-dataStore.SortStatusCurrentMegaBytesSorted)/dataStore.SortStatusCurrentSortSpeed).toFixed(1);

    // Protect against nonsense values
    if(dataStore.SortStatusCurrentSortSpeed<0){ dataStore.SortStatusCurrentSortSpeed=0.0; }
    if(!dataStore.SortStatusCurrentSortSpeed){ dataStore.SortStatusCurrentSortSpeed=0.0; }
    if(dataStore.SortStatusCurrentPercentageComplete<0){ dataStore.SortStatusCurrentPercentageComplete=0.0; }
    if(dataStore.SortStatusCurrentRemainingSortTime<0){ dataStore.SortStatusCurrentRemainingSortTime=0.0; }

    // Check the values in the console
    /*
    console.log('Dir: '+dataStore.midasFileDataDirectoryPath);
    console.log('File: '+dataStore.SortStatusCurrentFileName);
    console.log('Run: '+dataStore.SortStatusCurrentRunNumber);
    console.log('Sub: '+dataStore.SortStatusCurrentSubRunNumber);
    console.log('Size: '+dataStore.SortStatusCurrentFileSize+' MB');
    console.log('Sorted: '+dataStore.SortStatusCurrentMegaBytesSorted+' MB');
    console.log('Percent: '+dataStore.SortStatusCurrentPercentageComplete);
    console.log('Speed: '+dataStore.SortStatusCurrentSortSpeed);
    console.log('Remaining: '+dataStore.SortStatusCurrentRemainingSortTime);
*/

    // Update the printed Sort Status information on screen
    string = 'Sorting Run '+dataStore.SortStatusCurrentRunNumber+', subrun '+dataStore.SortStatusCurrentSubRunNumber+' at '+dataStore.SortStatusCurrentSortSpeed+' MB/s. Sorted '+dataStore.SortStatusCurrentMegaBytesSorted+' of '+dataStore.SortStatusCurrentFileSize+' MBs ('+dataStore.SortStatusCurrentPercentageComplete+'% completed). Estimated time to complete = '+dataStore.SortStatusCurrentRemainingSortTime+' s.';
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
}

function getMidasFileListFromServer(){

    // use a one-off XHR request with callback for getting the list of MIDAS files
    url = dataStore.spectrumServer + '/?cmd=getDatafileList&dir='+dataStore.midasFileDataDirectoryPath;
    XHR(url, "Problem getting list of MIDAS files from analyzer server", processMidasFileList, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function getHistoFileListFromServer(){

    // use a one-off XHR request with callback for getting the list of Histo files
    url = dataStore.spectrumServer + '/?cmd=getHistofileList&dir='+dataStore.histoFileDataDirectoryPath;
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

    console.log(dataStore.histoFileList);
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
    cell1.innerHTML = '';
    cell2.innerHTML = '';
    cell3.innerHTML = '';
    cell4.innerHTML = '';
    cell5.innerHTML = '<input type=\"checkbox\" id=\"Primary-checkbox\">';

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

	// Calculate the estimated Sorting time and make it easily human readable
	thisRunSize = dataStore.midasRunList[num].RunSize/1000000; // in MB
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
     
    cell1.innerHTML = dataStore.midasRunList[num].RunName;
    cell2.innerHTML = dataStore.midasRunList[num].NumSubruns+' subruns';
    cell3.innerHTML = thisRunSizeString;
    cell4.innerHTML = thisSortTimeString;
    cell5.innerHTML = '<input type=\"checkbox\" id=\"'+dataStore.midasRunList[num].RunName+'-checkbox'+'\" value=\"'+dataStore.midasRunList[num].RunName+'\" onclick=ToggleCheckboxOfThisMIDASFile(\"midasRunTableRow-'+(num+1)+'\")>';
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

function ToggleCheckboxOfThisMIDASFile(rowID){
    // Toggle the status of the checkbox for this row in the list, and highlight it

    num = (rowID.split('-')[1])-1;
    state = document.getElementById(dataStore.midasRunList[num].RunName+'-checkbox').checked;

    // Toggle the state and highlight the row if selected
    if(state ==  false){
	state=true;
	document.getElementById(rowID).style.backgroundColor = '#2e3477';
    }else{
	state=false;
	document.getElementById(rowID).style.backgroundColor = '#191C40';
    }

    // Set the checkbox
    document.getElementById(dataStore.midasRunList[num].RunName+'-checkbox').checked = state;
}

    function SubmitSelectedFilesFromTableToSortQueue(){
    // First build the list of selected files to sort
    // Then submit the files to the server as a series of XHR URL requests

	// Build list of urls for the selected files
	//var DataFileDirectory = '/tig/grifstore1b/grifalt/schedule145/Dec2023/';
	var DataFileDirectory = dataStore.midasFileDataDirectoryPath;

	// Format check for the data file
	
	if(DataFileDirectory[DataFileDirectory/length]!='/'){
	    DataFileDirectory += '/';
	}

	var urls = [];
	for(var i=0; i<dataStore.midasRunList.length; i++){
	    if(document.getElementById(dataStore.midasRunList[i].RunName+'-checkbox').checked == true){
		urls[urls.length] = dataStore.spectrumServer + '?cmd=addDatafile&filename='+DataFileDirectory+dataStore.midasRunList[i].RunName;
	    }
	}
	
	console.log(urls);
	
    // Submit a sort job to the analyzer server for each selected file
    //urls[0] = dataStore.spectrumServer + '?cmd=addDatafile&filename=/tig/grifstore1b/grifalt/schedule145/Dec2023/run21758_000.mid';
	for(i=0; i<urls.length; i++){
	    console.log(urls[i]);
        XHR(urls[i], 
            'check ODB - file submit rejected.', 
            function(){return 0},
            function(error){console.log(error)}
        )
	}
	
    }
