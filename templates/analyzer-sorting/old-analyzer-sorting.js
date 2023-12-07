////////////////////////////
// Analyzer Interface Sorting setup
////////////////////////////

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
    
    var thisPayload = payload.split(" ");
    dataStore.SortStatusCurrentRunNumber = parseInt(thisPayload[0]);
    dataStore.SortStatusCurrentSubRunNumber = parseInt(thisPayload[1]);
    dataStore.SortStatusCurrentFileSize = parseInt(thisPayload[2]);
    dataStore.SortStatusCurrentBytesSorted = parseInt(thisPayload[3]);
    dataStore.SortStatusCurrentPercentageComplete = parseFloat((dataStore.SortStatusCurrentBytesSorted/dataStore.SortStatusCurrentFileSize)*100.0).toFixed(2);
    string = 'Sorting Run '+dataStore.SortStatusCurrentRunNumber+', subrun '+dataStore.SortStatusCurrentSubRunNumber+'. Sorted '+dataStore.SortStatusCurrentBytesSorted+' of '+dataStore.SortStatusCurrentFileSize+' bytes ('+dataStore.SortStatusCurrentPercentageComplete+'% completed).';
    document.getElementById("SortingStatus").innerHTML = string;
}

function processMidasFileList(payload){

  //  payload = " [ run21758_000.mid , run21783_000.mid , run21830_000.mid , run21834_000.mid , run21731_000.mid , run21781_003.mid , run21781_000.mid , run21781_001.mid , run21781_002.mid , run21666_000.mid , run21696_000.mid , run21668_000.mid]";
    
    var thisPayload = payload.split("]")[0].split("[ \n")[1];
   // var thisPayload = payload.split("]")[0].split("[ ")[1];
    console.log(thisPayload);
    
    //extract list of midas files
    dataStore.midasFileList = thisPayload.split(" , \n ");
   // dataStore.midasFileList = thisPayload.split(" , ");
    console.log(dataStore.midasFileList);
    dataStore.midasFileList.sort();
    buildMidasFileTable();
    buildMidasFileTableSelect();
}

function buildMidasFileTable(){
// Create a row in the table for each midas file in the list provided by the server
    document.getElementById("MidFilesTable").innerHTML = '';

    // Add a title row to the table
    var row = document.getElementById("MidFilesTable").insertRow(document.getElementById("MidFilesTable").rows.length); 
    row.id = (0);
    var cell1 = row.insertCell(0); 
    var cell2 = row.insertCell(1);
    cell1.innerHTML = '';
    cell2.innerHTML = '<input type=\"checkbox\" id=\"Primary-checkbox\">';

      document.getElementById("Primary-checkbox").onclick = function(e){
         ToggleCheckboxOfAllMIDASFiles(this.checked);
      };
    
    // Add a row for each MIDAS file in the list received from the server
 for(var num=0; num<dataStore.midasFileList.length; num++){
    var row = document.getElementById("MidFilesTable").insertRow(document.getElementById("MidFilesTable").rows.length); 
    row.id = (num+1);
    var cell1 = row.insertCell(0); 
    var cell2 = row.insertCell(1);
    cell1.innerHTML = dataStore.midasFileList[num];
    cell2.innerHTML = '<input type=\"checkbox\" id=\"'+dataStore.midasFileList[num]+'-checkbox'+'\" value=\"'+dataStore.midasFileList[num]+'\">';
   // document.getElementById(dataStore.midasFileList[num]+'-checkbox').addEventListener("dblclick",CheckboxDblClick(dataStore.midasFileList[num]));
  }
    
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
	opt.innerHTML = '<div id=\'midasFileOptionContainer'+num+'\'></div>';
	opt.value = dataStore.midasFileList[num];
	SelectElement.appendChild(opt);
	document.getElementById('midasFileOptionContainer'+num).innerHTML = '<div id=midasFileOptionFilename'+num+'>'+dataStore.midasFileList[num]+'</div><div id=midasFileOptionFileSize'+num+' class=midasFileOptionFileSizeDiv>'+'File size and estimated sort time'+'</div>';
  }
    
}

function ToggleCheckboxOfAllMIDASFiles(state){
    // Toggle the status of the checkbox for all MIDAS files in the list
 for(var i=0; i<dataStore.midasFileList.length; i++){
     document.getElementById(dataStore.midasFileList[i]+'-checkbox').checked = state;
 }
}

function CheckboxDblClick(thisValue){
    var state = document.getElementById(thisValue+'-checkbox').checked;
    console.log('CheckboxDblClick function with arguments; '+thisValue+', '+state);
    var RunName = thisValue.split("_")[0];
    console.log(RunName);
    for(var i=0; i<dataStore.midasFileList.length; i++){
	console.log('Testing: '+i+', '+dataStore.midasFileList[i]+', for '+RunName);
	if(strncmp(dataStore.midasFileList[i],RunName,RunName.length)){
	    console.log('Set state for '+dataStore.midasFileList[i]);
	 //   document.getElementById(dataStore.midasFileList[i]+'-checkbox').checked = state;
	}
    }
    
}

    function SubmitSelectedFilesFromTableToSortQueue(){
    // First build the list of selected files to sort
    // Then submit the files to the server as a series of XHR URL requests

	// Build list of urls for the selected files
	var DataFileDirectory = '/tig/grifstore1b/grifalt/schedule145/Dec2023/';
	var urls = [];
 for(var i=0; i<dataStore.midasFileList.length; i++){
     if(document.getElementById(dataStore.midasFileList[i]+'-checkbox').checked == true){
	 urls[urls.length] = dataStore.spectrumServer + '?cmd=addDatafile&filename='+DataFileDirectory+dataStore.midasFileList[i];
     }
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
	    /*
        XHR(urls[i], 
            'check ODB - file submit rejected.', 
            function(){return 0},
            function(error){console.log(error)}
        )
*/
	}
	
    }
