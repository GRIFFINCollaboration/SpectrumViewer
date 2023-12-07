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

    // use a one-off XHR request with callback for getting the initial list of MIDAS files
    url = dataStore.spectrumServer + '/?cmd=getDatafileList&dir='+dataStore.midasFileDataDirectoryPath;
    XHR(url, "Problem getting list of MIDAS files from analyzer server", processMidasFileList, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function processMidasFileList(payload){

  //  payload = " [ run21758_000.mid , run21783_000.mid , run21830_000.mid , run21834_000.mid , run21731_000.mid , run21781_003.mid , run21781_000.mid , run21781_001.mid , run21781_002.mid , run21666_000.mid , run21696_000.mid , run21668_000.mid]";

    // receive the payload and split into an array of strings
    var thisPayload = payload.split("]")[0].split("[ \n")[1];
    
    // tidy up the strings to extract the list of midas files
    dataStore.midasFileList = thisPayload.split(" , \n ");

    // Sort the list in numberical and alphabetical order, then reverse the order so the newer files appear first
    dataStore.midasFileList.sort();
    dataStore.midasFileList.reverse();

    // Build the selectable list of midas files for the user
    buildMidasFileTableSelect();
}

function buildMidasFileTableSelect(){
    // Create a row in the table for each midas file in the list provided by the server
    SelectElement = document.getElementById("MidFilesSelect");
    for(var i=SelectElement.options.length-1; i>=0; i--){
	SelectElement.remove(i);
    }

    // Add an option for each MIDAS file in the list received from the server
    for(var num=0; num<dataStore.midasFileList.length; num++){
	var opt = document.createElement('option');
	opt.innerHTML = '<div id=\'midasFileOptionContainer'+num+'\' class=\'container-fluid\'></div>';
	opt.value = dataStore.midasFileList[num];
	SelectElement.appendChild(opt);
	document.getElementById('midasFileOptionContainer'+num).innerHTML = '<div id=midasFileOptionFilename'+num+' class=\'col-md-4\'>'+dataStore.midasFileList[num]+'</div><div id=midasFileOptionFileSize'+num+' class= class=\'col-md-8\'>'+',     File size and estimated sort time'+'</div>';
  }
    
}

    function SubmitSelectedFilesFromSelectToSortQueue(){
    // First build the list of selected files to sort
    // Then submit the files to the server as a series of XHR URL requests

	// Build list of urls for the selected files
	var DataFileDirectory = '/tig/grifstore1b/grifalt/schedule145/Dec2023/';
	var urls = [];
	var listOfSelectedMidasFiles = document.getElementById("MidFilesSelect").selectedOptions;
	console.log(listOfSelectedMidasFiles);
 for(var i=0; i<listOfSelectedMidasFiles.length; i++){
	 urls[urls.length] = dataStore.spectrumServer + '?cmd=addDatafile&filename='+DataFileDirectory+listOfSelectedMidasFiles[i].value;
 }
	
	
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
