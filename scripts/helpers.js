////////////////////
// Generic
////////////////////

function checkedRadio(name){
    //given the name of a radio group, return the checked radio

    var i, radios = document.getElementsByName(name);

    for (i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            return radios[i];
        }
    }

    return null
}

function releaser(operation, terminate, num) {
    //loop that releases control at each iteration
    //operation: function of num to perform at each loop
    //terminate: function to perform at end of loop
    //num: number of times to loop.
    if (num < 0){
        terminate()
        return
    }

    operation(num)
    setTimeout(function() {
        releaser(operation, terminate, --num)
    })
}

function getSelected(id){
    //return the current value selected by the select element with id.
    //thx http://stackoverflow.com/questions/1085801/get-selected-value-in-dropdown-list-using-javascript

    var e = document.getElementById(id);
    return e.options[e.selectedIndex].value;
}

function fadeHexColor(color, opacity){
    //given a hex color '#123456', return 'rgba(0x12, 0x34, 0x56, opactiy)'

    var R, G, B;

    R = parseInt(color.slice(1,3), 16);
    G = parseInt(color.slice(3,5), 16);
    B = parseInt(color.slice(5,7), 16);

    return 'rgba(' + R + ',' + G + ',' + B + ',' + opacity + ')';
}

function deleteNode(id){
    //delete a dom node with id
    //thanks https://developer.mozilla.org/en-US/docs/Web/API/Node/removeChild
    var node = document.getElementById(id);
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}

function alwaysThisLong(number, minLength){
    //returns number as a string padded with most-significant 0's to make it minLength.

    var num = ''+number;
    while(num.length<minLength)
        num = '0' + num

    return num
}

function promiseJSONURL(url){
    // promise to get response from <url>
    //thanks http://www.html5rocks.com/en/tutorials/es6/promises/

    // Return a new promise.
    return new Promise(function(resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open('GET', url);

        req.onload = function() {
            // This is called even on 404 etc
            // so check the status

            var mungedResponse;

            if (req.status == 200) {
                // Resolve the promise with the response text parsed as JSON
	//	console.log(req.response);
                mungedResponse = req.response.replace(/NULL/g,'[]');
                mungedResponse = mungedResponse.replace(/\'/g, '\"');
                resolve(JSON.parse(mungedResponse));
            }
            else {
                // Otherwise reject with the status text
                // which will hopefully be a meaningful error
                reject(Error(req.statusText));
            }
        };

        // Handle network errors
        req.onerror = function() {
            reject(Error("Network Error"));
        };

        // Make the request
        req.send();
    });
}

function promiseScript(url){
    //like promiseURL, but does the script tag dance to avoid non-CORS-compliant servers

    // Return a new promise.
    return new Promise(function(resolve, reject) {

        var script = document.createElement('script');

        script.setAttribute('src', url);
        script.onload = function(){
            deleteNode('promiseScript');
            resolve(null);
        }
        script.id = 'promiseScript';
        try{
            document.head.appendChild(script);
        } catch(err){
            console.log('script fetch fail')
        }
    });
}

function promisePartial(name){
    // promise to get tempate <name>; thanks http://www.html5rocks.com/en/tutorials/es6/promises/
    var rootURL, path;

    rootURL = window.location.protocol + "//" + window.location.host;
    path = window.location.pathname.split('/').slice(0,-1);
    for(i=0; i<path.length; i++){
        rootURL += path[i] + '/'
    }

    url = rootURL + 'partials/' + name + '.mustache';

    // Return a new promise.
    return new Promise(function(resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open('GET', url);

        req.onload = function() {
            // This is called even on 404 etc
            // so check the status
            if (req.status == 200) {
                // Resolve the promise with the response text
                resolve(req.response);
            }
            else {
                // Otherwise reject with the status text
                // which will hopefully be a meaningful error
                reject(Error(req.statusText));
            }
        };

        // Handle network errors
        req.onerror = function() {
            reject(Error("Network Error"));
        };

        // Make the request
        req.send();
    });
}

function promiseXHR(url, errorMessage, callback, reject){
    //generic XHR request guts

    // Return a new promise.
    return new Promise(function(resolve, reject) {
        // Do the usual XHR stuff
	var req = new XMLHttpRequest();
	req.open('GET', url);

	req.onload = function() {
            // This is called even on 404 etc
            // so check the status
            if (req.status == 200) {
		// Call the callback function
		callback(req.response);
                // Resolve the promise with the response text
                resolve('Success!');
            }
            else {
		reject(ErrorConnectingToAnalyzerServer(req.statusText));
            }
	};

	// Handle network errors
	req.onerror = function() {
            reject(ErrorConnectingToAnalyzerServer(errorMessage));
	};

	// Make the request
	req.send();
    });
}

function heartbeatXHR(url, errorMessage, callback, reject){
    //start the data fetching heartbeat that uses a XHR request
    //note the dataStore.heartbeat object needs to be defined first.
    /*
    console.log('heartbeatXHR called with lock='+dataStore.sortStatusRequestLock+' and count of '+dataStore.sortStatusRequestBlockCount);

    if(dataStore.sortStatusRequestLock == true){
	// Do not issue new requests if there is a request pending
	dataStore.sortStatusRequestBlockCount++;
	if(dataStore.sortStatusRequestBlockCount>10){
	    // Only block up to ten requests, then issue a new one
	    console.log('sort status request lock reset after '+dataStore.sortStatusRequestBlockCount+' blocked requests');
	    dataStore.SortStatusRequestLock = false;
	    dataStore.sortStatusRequestBlockCount=0;
	}else{
	    // Block this new request being sent but still set the timeout for the next one
	    console.log('sort status request blocked '+dataStore.sortStatusRequestBlockCount+' times');
	    window.clearTimeout(dataStore.heartbeatTimer)
	    dataStore.heartbeatTimer = window.setTimeout(heartbeatXHR, dataStore.heartbeatInterval);

	    console.log('heartbeatXHR values at return: lock='+dataStore.sortStatusRequestLock+' and count of '+dataStore.sortStatusRequestBlockCount);
	    return;
	}
    }
*/

    url = dataStore.spectrumServer + '/?cmd=getSortStatus';
    errorMessage = "Problem getting Sort Status from analyzer server";
    callback = processSortStatus;
    XHR(url, errorMessage, callback, function(error){ErrorConnectingToAnalyzerServer(error)});
    dataStore.sortStatusRequestLock = true;
   // console.log('sort status request sent and Lock='+dataStore.sortStatusRequestLock);

    // Set timeout for the next sortStatus heartbeat
    window.clearTimeout(dataStore.heartbeatTimer)
    dataStore.heartbeatTimer = window.setTimeout(heartbeatXHR, dataStore.heartbeatInterval);
   // console.log('heartbeatXHR values at end: lock='+dataStore.sortStatusRequestLock+' and count of '+dataStore.sortStatusRequestBlockCount);

}

function prepareTemplates(templates){
    //take an array of template names, and load their inner html into a simmilarly keyed object.

    var i, guts = {};

    for(i=0; i<templates.length; i++){
        guts[templates[i]] = document.getElementById(templates[i]).import.getElementById(templates[i]).innerHTML
    }

    return guts
}

function isNumeric(n) {
    // is n a number?

    return !Number.isNaN(parseFloat(n)) && Number.isFinite(n);
}

function subtractHistograms(h0, h1){
    // perform element-wise subtraction h1-h0

    var i, diff = []

    if(h0.length != h1.length){
        console.log('tried to subtract histograms of different length, abort')
        return diff
    }

    for(i=0; i<h0.length; i++){
        diff[i] = h1[i] - h0[i];
    }

    return diff

}

function XHR(url, errorMessage, callback, reject){
    //generic XHR request guts

    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
        // This is called even on 404 etc
        // so check the status
        if (req.status == 200) {
            callback(req.response);
        }
        else {
            reject(ErrorConnectingToAnalyzerServer(req.statusText));
        }
    };

    // Handle network errors
    req.onerror = function() {
        reject(ErrorConnectingToAnalyzerServer(errorMessage));
    };

    // Make the request
    req.send();
}

function RCS(data, theory, parameters){
    //return the reduced chi^2 for an array of data compared to an array of corresponding theory predictions
    //assume variance on data = data (ie, poissonian counting error)
    //parameters == number of fitted parameters

    var i, rcs = 0;

    for(i=0; i<data.length; i++){
        rcs += Math.pow(data[i] - theory[i],2) / data[i]
    }

    return rcs / (data.length - parameters - 1);
}

function gauss(amplitude, center, width, x){
    return amplitude*Math.exp(-1*(x-center)*(x-center)/2/width/width);
}

// attach the .equals method to Array's prototype to call it on any array
// thanks http://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}

//replace every element in an array with 0
Array.prototype.zero = function(){
    var i;

    for(i=0; i<this.length; i++){
        this[i] = 0;
    }
}

//sum the elements in an array from [x0, x1)
Array.prototype.integrate = function(x0, x1){
    var i, sum = 0

    if(!x0)
        x0 = 0
    if(!x1)
        x1 = this.length

    for(i=x0; i<x1; i++)
        sum += this[i]

    return sum;
}

//fill an array with n copies of value
Array.prototype.fillN = function(value, n){
    var i;
    for(i=0; i<n; i++)
        this[i] = JSON.parse(JSON.stringify(value));
}


function parseQuery(){
	//return an object with keys/values as per query string
	//note all values will be strings.

	var elts = {};
	var queryString = window.location.search.substring(1)
	var value, i;

	queryString = queryString.split('&');
	for(i=0; i<queryString.length; i++){
		value = queryString[i].split('=');
		elts[value[0]] = value[1];
	}

    return elts;
}


////////////////////
// Histogram file handling
////////////////////

function GetURLArguments(callback){
	//return an object with keys/values as per query string
	//note all values will be strings.

	var elts = {};
	var queryString = window.location.search.substring(1)
        var value, i;
        var urlData = [];

	queryString = queryString.split('&');
	for(i=0; i<queryString.length; i++){
		value = queryString[i].split('=');
		urlData[value[0]] = value[1];
	}

    // Save the information to the dataStore
    // Save the hostname and port number
    dataStore.spectrumServer = 'http://'+urlData.backend+'.triumf.ca:'+urlData.port;
    dataStore.spectrumServerBackend = urlData.backend;
    dataStore.spectrumServerPort = urlData.port;

    // Copy the histogram URL arguments to the dataStore
    dataStore.histoFileDirectoryPath = urlData.histoDir;
    dataStore.histoFileName = urlData.histoFile;

    if(dataStore.histoFileDirectoryPath==undefined){
	// No directory for the histogram files has been provided in the URL, so we provide a default one
	//dataStore.histoFileDirectoryPath = '/tig/grifstore0b/griffin/schedule140/Histograms';
	dataStore.histoFileDirectoryPath = '';
    }
    if(dataStore.histoFileName==undefined){
	// No histogram filename has been provided in the URL, so we set the string back to nothing
	dataStore.histoFileName = '';
    }

    callback();
}

function promiseURLArguments(){
  //return an object with keys/values as per query string
  //note all values will be strings.

  // Return a new promise.
  return new Promise(function(resolve, reject) {

    var elts = {};
    var queryString = window.location.search.substring(1)
    var value, i;
    var urlData = [];

    queryString = queryString.split('&');
    for(i=0; i<queryString.length; i++){
      value = queryString[i].split('=');
      urlData[value[0]] = value[1];
    }

    // Save the information to the dataStore
    // Save the hostname and port number
    dataStore.spectrumServer = 'http://'+urlData.backend+'.triumf.ca:'+urlData.port;
    dataStore.spectrumServerBackend = urlData.backend;
    dataStore.spectrumServerPort = urlData.port;

    // Copy the histogram URL arguments to the dataStore
    dataStore.histoFileDirectoryPath = urlData.histoDir;
    dataStore.histoFileName = urlData.histoFile;

    if(dataStore.histoFileDirectoryPath==undefined){
      // No directory for the histogram files has been provided in the URL, so we provide a default one
      //dataStore.histoFileDirectoryPath = '/tig/grifstore0b/griffin/schedule140/Histograms';
      dataStore.histoFileDirectoryPath = '';
    }
    if(dataStore.histoFileName==undefined){
      // No histogram filename has been provided in the URL, so we set the string back to nothing
      dataStore.histoFileName = '';
    }

    // resolve the promise
    resolve('Success!');
  });
}

function initiateSortStatusHeartbeat(){
    // initiate heartbeat for the Sort Status
    var url = dataStore.spectrumServer + '/?cmd=getSortStatus'
    heartbeatXHR(url, "Problem getting Sort Status from analyzer server", processSortStatus, ErrorConnectingToAnalyzerServer);
}

function getConfigFileFromServer(){
    // get the Global conditions, Gates conditions and Histogram definitions from the server/ODB
    url = dataStore.spectrumServer + '/?cmd=viewConfig';
    XHR(url, "Problem getting Config file from analyzer server", processConfigFile, function(error){ErrorConnectingToAnalyzerServer(error)});
}

function getMidasFileListFromServer(){
    // use a one-off XHR request with callback for getting the list of MIDAS files
    url = dataStore.spectrumServer + '/?cmd=getDatafileList&dir='+dataStore.midasFileDataDirectoryPath;
    XHR(url, "Problem getting list of MIDAS files from analyzer server", processMidasFileList, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function getMidasFileDetailsFromServer(){
    // use a one-off XHR request with callback for getting the list of MIDAS files
    url = dataStore.spectrumServer + '/?cmd=getDatafileDetails&dir='+dataStore.midasFileDataDirectoryPath;
    XHR(url, "Problem getting details of MIDAS files from analyzer server", processMidasFileDetails, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function getHistoFileListFromServer(){
    // use a one-off XHR request with callback for getting the list of Histo files
    url = dataStore.spectrumServer + '/?cmd=getHistofileList&dir='+dataStore.histoFileDirectoryPath;
    XHR(url, "Problem getting list of Histogram files from analyzer server", processHistoFileList, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function GetSpectrumListFromServer(ServerName, callback){
    // Get the Spectrum List from the analyser server

    var errorMessage = 'Error receiving Spectrum List from server, '+ServerName;

    // url is just /?cmd=getSpectrumList for online data.
    // url includes a histoFile for opening a midas file
    // dataStore.histoFileName
    var urlString = ServerName;
    urlString += '/?cmd=getSpectrumList';
    if(dataStore.histoFileName.length>0 && dataStore.histoFileName!='Online'){
	var HistoFileDirectory = dataStore.histoFileDirectoryPath;
	// Format check for the data file
	if(HistoFileDirectory[HistoFileDirectory.length]!='/'){
	    HistoFileDirectory += '/';
	}
	urlString += '&filename='+HistoFileDirectory+dataStore.histoFileName;
    }

    var req = new XMLHttpRequest();
    req.open('GET', urlString);

    // Once the response is received, convert the text response from the server to JSON Object
  req.onreadystatechange = () => {
      if (req.readyState === 4) {
	  // Send the response to the callback function, and provide a callback function for it
          callback(req.response,constructNewSpectrumMenu);
    }
  };

    // Handle network errors
    req.onerror = function() {
        reject(ErrorConnectingToAnalyzerServer(errorMessage));
    };

    // Make the request
    req.send();

}


function processConfigFile(payload){
    // callback after getting the Config file containing the Global conditions, Gates conditions and Histogram definitions from the server/ODB
    // finish initial setup

    // A response was received from the server, so ensure the connection error is not displayed
    ClearErrorConnectingToAnalyzerServer();

    // Unpack the response and place the response from the server into the dataStore
    // Protect against an empty response
    if(payload != undefined && payload.length>4){
	dataStore.Configs = JSON.parse(payload);
    }else{
	// Need to do something better than return here.
	// Should make the server request again but protect against a maximum call stack depth.
  console.log('Empty response from viewConfig');
	return;
    }
    //	console.log(dataStore.Configs);

    // Only use the directories from the config file on the initial load
    if(dataStore.configFileTimestamp == 0){

	// Unpack the Directories content here
	// If the dataStore entry is empty then save the directory path from this Config if one is present
	if(dataStore.Configs.Analyzer[5].Directories[0].Path.length>0){ dataStore.midasFileDataDirectoryPath = dataStore.Configs.Analyzer[5].Directories[0].Path; }
	if(dataStore.Configs.Analyzer[5].Directories[1].Path.length>0){ dataStore.histoFileDirectoryPath = dataStore.Configs.Analyzer[5].Directories[1].Path; }
	if(dataStore.Configs.Analyzer[5].Directories[2].Path.length>0){ dataStore.configFileDataDirectoryPath = dataStore.Configs.Analyzer[5].Directories[2].Path; }

	// If both the dataStore entry and the config entry were empty then supply a default value here
	if(dataStore.midasFileDataDirectoryPath.length<1){ dataStore.midasFileDataDirectoryPath = '/tig/grifstore1/grifalt/schedule146/Calibrations_June2024'; }
	if(dataStore.histoFileDirectoryPath.length<1){ dataStore.histoFileDirectoryPath = '/tig/grifstore1/grifalt/schedule146/Calibrations_June2024'; }
	if(dataStore.configFileDataDirectoryPath.length<1){ dataStore.configFileDataDirectoryPath = '/home/grifstor/daq/analyzer/grif-replay'; }
    }

    // Record the timestamp of when this config file is received
    dataStore.configFileTimestamp = Math.floor(Date.now() / 1000);
console.log('Save timestamp as '+dataStore.configFileTimestamp);

    // Reset the dataStore of any old definitions
    dataStore.sortCodeVariables = [];
    dataStore.globalCondition = {                   // place to park Global condition info on the dataStore
        "globalIndex" : 0,               // monotonically increasing counter to create unique IDs for new Glabal condition blocks
	"contents" : []             // array of structures holding the variables and values for each Global condition
    };
    dataStore.gateCondition = {                  // place to park Gate condition info on the dataStore
        "gateIndex" : 0,                 // monotonically increasing counter to create unique IDs for new Gate condition blocks
        "nRows" : [],                 // array of monotonic counters for number of rows inserted into Gate condition block; Gate block # == array index.
	"contents" : []             // array of structures holding the variables and values for each Gate condition
    };
    dataStore.histogramDefinition = {             // place to park Histogram definition info on the dataStore
        "histogramIndex" : 0,            // monotonically increasing counter to create unique IDs for new Histogram condition blocks
        "nRows" : [],            // array of monotonic counters for number of rows inserted into Histogram condition block; Histogram block # == array index.
        "contents" : []            // place to save Histogram definition parameters
    };

    // Unpack the Config file from the server into the dataStore layout

    // Unpack Sort Variables content
    for(var i=0; i<dataStore.Configs.Analyzer[0].Variables.length; i++){
	dataStore.sortCodeVariables.push(dataStore.Configs.Analyzer[0].Variables[i]);
    }

    // Unpack Global content
    for(var i=0; i<dataStore.Configs.Analyzer[3].Globals.length; i++){
	dataStore.globalCondition.contents.push(dataStore.Configs.Analyzer[3].Globals[i]);
    }

    // Unpack Gate content
    for(var i=0; i<dataStore.Configs.Analyzer[1].Gates.length; i++){
	dataStore.gateCondition.contents.push(dataStore.Configs.Analyzer[1].Gates[i]);
    }

    // Unpack the Histogram content
    for(var i=0; i<dataStore.Configs.Analyzer[2].Histograms.length; i++){
	dataStore.histogramDefinition.contents.push(dataStore.Configs.Analyzer[2].Histograms[i]);
    }

    // Unpack the Calibrations content here
    //dataStore.Configs.Analyzer[4].Calibrations

    // Update content that involves the config file
    dispatcher({}, 'requestHistogramsRefresh');

}

function processMidasFileList(payload){

    // A response was received from the server, so ensure the connection error is not displayed
    ClearErrorConnectingToAnalyzerServer();

    // receive the payload and split into an array of strings
    var thisPayload = payload.split("]")[0].split("[ \n")[1];

    // Protect against an empty response
    if(thisPayload != undefined && thisPayload.length>4){
	// tidy up the strings to extract the list of midas files
	var thisPayloadList = thisPayload.split(" , \n ");
    }else{
	var thisPayloadList = [];
    }

    // Declare a local object to unpack the list and then sort it
    var thisMidasFileList = [
   	                     { "Names" : 'name', "Sizes" : 5000000 , "Titles" : '' }
                            ];

    for(var i=0; i<thisPayloadList.length; i++){
	thisMidasFileList[i] = {
	    "Names" : thisPayloadList[i].split(" , ")[0],
	    "Sizes" : parseInt(thisPayloadList[i].split(" , ")[1]),
	    "Titles" : thisPayloadList[i].split(" , ")[2]
	}
    }

    // Sort the list in reverse numberical and alphabetical order so the newer files appear first
    thisMidasFileList.sort((a,b) => (a.Names < b.Names) ? 1 : ((b.Names < a.Names) ? -1 : 0));

    // Save this list of midas files to the dataStore
    dataStore.midasFileList = thisMidasFileList;

    // Declare this object structure
    var thisMidasRunList = [{
	    "RunName" : '',
	    "RunTitle" : '',
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
        // Check if this is a newly encoutered Run number and if it is, create space for it
	thisRunName = thisMidasFileList[i].Names.split("_")[0];
	if(i==0 || (thisRunName != thisMidasFileList[i-1].Names.split("_")[0])){
	    num++;
	    j=0;
	    thisMidasRunList[num] = {
	    "RunName" : '',
	    "RunTitle" : '',
	    "NumSubruns" : 0,
	    "RunSize" : 0,
	    "Expanded" : false,
	"SubRunList" : []
          };
	    thisMidasRunList[num].RunName = thisRunName;
	    thisMidasRunList[num].RunSize = 0;
	}

	// The list is sorted backwards so that the most recent runs appear at the top.
	// Only subrun 000 has the title, so the first instance of this run we come across likely does not have the title.
	// So here we find the title and add it for this run.
	try{
	    if(thisMidasFileList[i].Titles.length>1){
		thisMidasRunList[num].RunTitle = thisMidasFileList[i].Titles.trim();
	    }
	}catch(err){ }

	// Keep track of the total run size from the size of each subrun, and the total number of subruns
	thisMidasRunList[num].RunSize = (thisMidasRunList[num].RunSize + thisMidasFileList[i].Sizes);
	thisMidasRunList[num].NumSubruns++;
	// Store the name and size of each subrun
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

    // update the content that includes the midas data files, then get the MIDAS file details from the server
    const thisPromise = new Promise((resolve, reject) => {
                                                           dispatcher({}, 'requestSortingRefresh')
     }).then(
         getMidasFileDetailsFromServer()
       );

}

function processMidasFileDetails(payload){

    // A response was received from the server, so ensure the connection error is not displayed
    ClearErrorConnectingToAnalyzerServer();

    // receive the payload and split into an array of strings
    var thisPayload = payload.split("]")[0].split("[ \n")[1];

    // tidy up the strings to extract the list of midas files
    var thisPayloadList = thisPayload.split(" , \n ");

    // Declare a local object to unpack the list and then sort it
    var thisMidasFileList = [
   	                     { "Names" : 'name', "Sizes" : 5000000 , "Titles" : '' }
                            ];

    for(var i=0; i<thisPayloadList.length; i++){
	thisMidasFileList[i] = {
	    "Names" : thisPayloadList[i].split(" , ")[0],
	    "Sizes" : parseInt(thisPayloadList[i].split(" , ")[1]),
	    "Titles" : thisPayloadList[i].split(" , ")[2]
	}
    }

    // Sort the list in reverse numberical and alphabetical order so the newer files appear first
    thisMidasFileList.sort((a,b) => (a.Names < b.Names) ? 1 : ((b.Names < a.Names) ? -1 : 0));

    // Save this list of midas files to the dataStore
    dataStore.midasFileList = thisMidasFileList;

    // Go through the new list of titles and insert them into the midasRunList object
    i=0;
    while(i<dataStore.midasFileList.length){

	// The list is sorted backwards so that the most recent runs appear at the top.
	// Only subrun 000 has the title, so the first instance of this run we come across likely does not have the title.
	// So here we find the title and add it for this run.
	try{
	    if(dataStore.midasFileList[i].Titles.length>1){

		// Find the indexID of this run in the MidasRunList object
		var indexID = dataStore.midasRunList.map(function(e) { return e.RunName; }).indexOf(dataStore.midasFileList[i].Names.split("_")[0]);

		dataStore.midasRunList[indexID].RunTitle = dataStore.midasFileList[i].Titles.trim();

	    }
	}catch(err){ console.log('Caught this error in processMidasFileDetails, '+err); }

	i++;
    }

    // Add these details to the table
    addFileDetailsToMidasFileTable();
}

function processHistoFileList(payload){

    // A response was received from the server, so ensure the connection error is not displayed
    ClearErrorConnectingToAnalyzerServer();

    // receive the payload and split into an array of strings
    var thisPayload = payload.split(" ]")[0].split("[ \n")[1];

    // Protect against an empty response
    if(thisPayload != undefined){
    // tidy up the strings to extract the list of midas files
	dataStore.histoFileList = thisPayload.split(" , \n ");
    }else{
	dataStore.histoFileList = [];
    }

    // Sort the list in numberical and alphabetical order, then reverse the order so the newer files appear first (note this is not ideal for sub-runs)
    dataStore.histoFileList.sort();
    dataStore.histoFileList.reverse();

    // Update content that involves the Histogram list
    dispatcher({}, 'requestViewerRefresh');
    dispatcher({}, 'requestSortingRefresh');

    // Set up the list of histo files
    setupHistoListSelect();
}

function setupHistoListSelect(){
    // Only proceed if this is needed.
    if(!document.getElementById('histo-list-menu-div')){ return; }

    // Clear the previous contents
    document.getElementById('histo-list-menu-div').innerHTML = 'Histogram file: ';

    // Create a select input for the histo file list
    var newSelect = document.createElement("select");
    newSelect.id = 'HistoListSelect';
    newSelect.name = 'HistoListSelect';
    newSelect.onchange = function(){
    dataStore.histoFileName = this.value;
	GetSpectrumListFromServer(dataStore.spectrumServer,processSpectrumList);
	console.log('Histogram selected is '+dataStore.histoFileName);
    }.bind(newSelect);

    document.getElementById('histo-list-menu-div').appendChild(newSelect);

    // Add the list of histo files as the options
    thisSelect = document.getElementById('HistoListSelect');
	thisSelect.add( new Option('Online', 'Online') );
    for(var i=0; i<dataStore.histoFileList.length; i++){
	thisSelect.add( new Option(dataStore.histoFileList[i], dataStore.histoFileList[i]) );
    }

    // if a Histogram file has been specified in the URL, make it the selected option
    if(dataStore.histoFileName.length>0){
	thisSelect.value = dataStore.histoFileName;
    }

    // Get the spectrum list for whatever is selected on startup
    dataStore.histoFileName = document.getElementById('HistoListSelect').value;
    GetSpectrumListFromServer(dataStore.spectrumServer,processSpectrumList);
}

function ErrorConnectingToAnalyzerServer(error){
    var string = 'Problem connecting to analyzer server: '+dataStore.spectrumServer+'<br>'+error;
    document.getElementById('messageDiv').innerHTML = string;
    document.getElementById('messageDiv').style.display= 'block';
}

function ClearErrorConnectingToAnalyzerServer(){
    // Clear the error div and message
    document.getElementById('messageDiv').style.display= 'none';
}

function processSpectrumList(payload,callback){

    // A response was received from the server, so ensure the connection error is not displayed
    ClearErrorConnectingToAnalyzerServer();

    // We have had problems with corruption in the spectrum list. So protect against errors here
    try{
	var SpectrumList = JSON.parse(payload);
    }
    catch(err){
	console.log('Problem with format of the Spectrum list provided by the server for histogram file, '+dataStore.histoFileName);
	console.log(err);
	return;
    }

    // Clear the previous list of 2D histogram names
    dataStore.twoDimensionalSpectra = [];

    //declare the holder for the top level groups
    var topGroups = [];

    // Sort through the list from the server to find the folders, subfolders and histogram titles
    // Use this to set up the topGroups, subGroups and items for the menu generation
    for (i in SpectrumList)
    {
	thisFolderTitle = i; // this is the topGroup

	// Create a new topGroup for this folder
	newGroup = {
                     "name": thisFolderTitle,
                     "id": thisFolderTitle,
                     "color": '#367FA9',
                     "subGroups": []
	           }

	for (j in SpectrumList[i])
	{
	    for (k in SpectrumList[i][j])
	    {
		y = SpectrumList[i][j][k]
		if (typeof y === 'string' || y instanceof String){
		    if(k==0){
			thisSubfolderTitle = y;   // this is the subGroup

			// Create a new subGroup
			newSubgroup = {
                                       "subname": thisSubfolderTitle,
                                       "id": thisFolderTitle.substring(0,3)+thisSubfolderTitle,
                                       "items": []
                                      }
			// Add this subGroup to the topGroup
                        newGroup.subGroups.push(newSubgroup);
		    }else{
			thisHistoTitle = y;   // this is the items

			// If this spectrum is from a histogram file then attach that histogram name to the beginning of this spectrum name.
			// if a Histogram file has been specified, then the histograms will have been requested from there
			if(dataStore.histoFileName.length>0){
			    thisHistoTitle = dataStore.histoFileName.split('.')[0]+ ':' + thisHistoTitle;
			}

			// If this is a 2d histogram then ':2d' is attached to the end of the name as an identifier
			// Save this histogram name into the dataStore.twoDimensionalSpectra list so it can be identified as 2d.
			// Remove the ':2d' so only the filename part is requested from the server
			if(thisHistoTitle.includes(':2d')){
			    thisHistoTitle = thisHistoTitle.split(':2d')[0];
			    dataStore.twoDimensionalSpectra.push(thisHistoTitle);
			}

			// Build the object
			var thisObject = {
			    'plotID' : thisHistoTitle,
			    'plotTitle' : y
			};

			// Add this histogram to the items list in this subGroup of the topGroup
                        newGroup.subGroups[newGroup.subGroups.length-1].items.push(thisObject);
		    }
		}
	    }
	}
	// Add this new topGroup to the topGroups object
	topGroups.push(newGroup)
    }

    // Add the Projections subfolder for the gating tool
    // Only needed if there are 2d objects in this spectrum list
    newSubgroup = {
        "subname": 'Projections',
        "id": 'proj',
        "items": []
    }
    // Add this subGroup to the topGroup
    newGroup.subGroups.push(newSubgroup);

    dataStore.topGroups = topGroups;

    // Now need to build the menu based on these topGroups and subGroups
    // callback should be constructNewSpectrumMenu();
    callback();
}

function constructNewSpectrumMenu(){

    // Protect against an infinite loop being created by the timeout
    dataStore.counter++;
    if(dataStore.counter>5){
	console.log('The spectrum menu failed to generate correctly after five attempts.');
	return;
    }

    // Clear any previous menu content
    if(document.getElementById('navbar-content-div').innerHTML){
	document.getElementById('navbar-content-div').innerHTML = '';
    }
    // Clear any previous dataStore plotList object
    if(dataStore._plotList != undefined){ delete dataStore._plotList; }
    if(dataStore.currentTopGroup != undefined){ delete dataStore.currentTopGroup; }

    // build the menu based on these topGroups and subGroups
    // Need to ensure the constructor dataStore._plotList has been created.
    // If we get here too quickly on initial page load then we need to wait for the initialization to be completed and try again
    try{
	dataStore._plotList = new plotList('navbar-content-div');
	dataStore._plotList.setup();
    }
    catch(err){
	const thisTimeout = setTimeout(function() { constructNewSpectrumMenu(); }, 200);
    }
}


////////////////////
// Dygraphs
////////////////////

function arrangePoints(x, y, flags){
    //arrange an array of x values, an array of arrays of y values, and data series flag for consumption by dygraphs
    //see test suite for examples of behavior.

    var copyFlags = []
    var uniqueFlags;
    var i, j, k, series, data = [];
    var row = [];

    for(i=0; i<flags.length; i++){
        copyFlags.push(flags[i]);
    }
    uniqueFlags = Array.from(new Set(flags.sort()));

    for(i=0; i<x.length; i++){
        row = [x[i]];
        series = uniqueFlags.indexOf(copyFlags[i]);
        for(j=0; j<uniqueFlags.length; j++){
            if(j == series)
                for(k=0; k<y.length; k++)
                    row.push(y[k][i]);
            else
                row.push(null);
        }
        data.push(row);
    }

    return data;
}

function createBins(n, constant){
    //returns an array [0,1,2,...n-1], useful for creating the x-array for arrangePoints if all you have is a spectrum of y values.
    //if constant is defined, returns an array of length n repeating constant.
    //thanks http://stackoverflow.com/questions/3746725/create-a-javascript-array-containing-1-n

    if(arguments.length === 1)
        return Array.apply(null, {length: n}).map(Number.call, Number)
    else
        return Array.apply(null, {length: n}).map(function(){return constant}, null)

}

function dispatcher(payload, eventName){
    //dispatch an event carrying payload as its detail, to listeners with ids listed.
    var evt;

    evt = new CustomEvent(eventName, {
        detail: payload,
        cancelable: true
    });

    // Do not dispatch the event if the listener has not been created yet
    if(dataStore[eventName+'Listeners'] != undefined){
	dataStore[eventName+'Listeners'].map(function(id){
            document.getElementById(id).dispatchEvent(evt);
	});
    }
}


function listener(id, event, callback){
    //set <id> to listen for custom <event>, and respond with callback(event).

    if(!dataStore[event+'Listeners'])
        dataStore[event+'Listeners'] = [];

    dataStore[event+'Listeners'].push(id);
    document.getElementById(id).addEventListener(event, callback, false);
}

function constructQueries(keys){
    //takes a list of plot names and produces the query string needed to fetch them, in an array
    //more than 16 requests will be split into separate queries.

    var i, j, queryString, queries = [];
    for(i=0; i<Math.ceil(keys.length/16); i++){
        queryString = dataStore.spectrumServer + '?cmd=callspechandler';
	if(dataStore.histoFileName!=undefined){
	    if(dataStore.histoFileName.length>0 && dataStore.histoFileName!='Online'){
		var HistoFileDirectory = dataStore.histoFileDirectoryPath;
		// Format check for the data file
		if(HistoFileDirectory[HistoFileDirectory.length]!='/'){
		    HistoFileDirectory += '/';
		}
		queryString += '&filename='+HistoFileDirectory+dataStore.histoFileName;
	    }
	}

        for(j=i*16; j<Math.min( (i+1)*16, keys.length ); j++){
            queryString += '&spectrum' + j + '=' + keys[j];
        }
        queries.push(queryString);
    }
    return queries
}

//////////////////////////
// 2D spectrum viewer
//////////////////////////



function projectXaxis(gateMin,gateMax){
    // 2d histogram data is stored as an array of arrays.
    // An x axis bin is accessed as data[x] = array of all y bins.
    // A y axis bin is accessed as data[0->Xlength][y] = a speciifc element of a series of arrays.
    // Individual elements can be accessed as data[x][y].
    // this function projects all y rows down to a single array by summing the elements

    // If no limits for the gate/projection are provided then make a total projection
    if(gateMin == undefined || gateMin<1) gateMin = 0;
    if(gateMax == undefined){
	gateMax = dataStore.hm._raw.length-1;
    // Set name for total projection
	thisProjectionName = dataStore.activeMatrix+'x';
    }else{
    // Set a unique name based on gate limits
	thisProjectionName = dataStore.activeMatrix+'x-'+gateMin+'-'+gateMax;
    }

    var gateLength = gateMax-gateMin;
    var thisProjection = [];
    let filledArray = new Array(1023).fillN(0); // May need to be .fillN()
    for(let i=0; i<dataStore.hm._raw[0].length; i++){
	thisProjection[i] = 0;
    }

    // build the projection from the sum of the arrays between the gate min and max values.
    for(let i=gateMin; i<=gateMax; i++){
	thisRow = dataStore.hm._raw[i];
	thisProjection = thisProjection.map(function (num, index) {
	    return num + thisRow[index];
	});
    }

    // Ensure there are no NaN entries
    for(i=0; i<thisProjection.length; i++){
	if(isNaN(thisProjection[i])){ thisProjection[i]=0; }
    }

    // write the created spectrum to the storage object
    dataStore.createdSpectra[thisProjectionName] = thisProjection;

    return thisProjectionName;
}

function projectYaxis(gateMin,gateMax){
    // 2d histogram data is stored as an array of arrays; data[y][x]
    // An x axis slice is accessed as data[0->Ylength][x] = a speciifc element of a series of arrays.
    // A y axis bin is accessed as data[y][0->Xlengthy] = array of all x bins.
    // Individual elements can be accessed as data[y][x].
    // this function projects all x elements across to a single array by summing the elements between gateMin and gateMax extracted from all y rows.

    // If no limits for the gate/projection are provided then make a total projection
    if(gateMin == undefined || gateMin<1) gateMin = 0;
    if(gateMax == undefined){
	gateMax = dataStore.hm._raw[0].length-1;
    // Set name for total projection
	thisProjectionName = dataStore.activeMatrix+'y';
    }else{
    // Set a unique name based on gate limits
	thisProjectionName = dataStore.activeMatrix+'y-'+gateMin+'-'+gateMax;
    }

    var gateLength = gateMax-gateMin;
    var thisProjection = [];
    for(let i=0; i<dataStore.hm._raw.length; i++){
	thisProjection[i] = 0;
    }

    // build the projection from the sum of the elements between the gate min and max values of all arrays.
    for(let i=0; i<dataStore.hm._raw.length; i++){
	thisProjection[i] = dataStore.hm._raw[i].slice(gateMin,gateMax).reduce((a, b) => a + b, 0);
    }

    // Ensure there are no NaN entries
    for(i=0; i<thisProjection.length; i++){
	if(isNaN(thisProjection[i])){ thisProjection[i]=0; }
    }

    // write the created spectrum to the storage object
    dataStore.createdSpectra[thisProjectionName] = thisProjection;

    return thisProjectionName;
}

function packZ(raw2){
    // histo z values arrive as [row length, x0y0, x1y0, ..., x0y1, x1y1, ..., xmaxymax]
    // heatmap wants it as [[x0y0, x1y0, ..., xmaxy0], [x0y1, x1y1, ..., xmaxy1], ...]
  //  console.log('unpackZ');
   // console.log(raw);
   // console.log(raw2);

    // Declare local variables
    var repack = [],repack2 = [],
	rowLength = dataStore.activeMatrixXaxisLength,
        nRows = dataStore.activeMatrixYaxisLength,
	subMatrixXlength = 16,
	subMatrixYlength = 16,
        i, j, type, row=[];
//    console.log(rowLength);
//    console.log(nRows);

    /*
    // Unpack the matrix data as a list of data (slowest transfer from server)
    for(i=0; i<nRows; i++){
        repack.push(raw.slice(rowLength*i, rowLength*(i+1)-1));
    }
    */

    // Unpack the matrix data as a list of 16x16 submatrices (faster transfer from server)
    // The values are given in the order of x0y0, x1y0, ..., x0y1, x1y1, ..., xmaxymax, but split into the 16x16 submatrices
    // Submatrix format is one of three:
    // ["empty"],
    // ["array", 0,1,2,3,4,5 ... 255 ],
    // ["list", 23,55, ... ],
    // these formats are as follows:
    // "empty" means all 256 bins are zero
    // "array" is just 256 values - contents (z value) of each x,y bin
    // "list" is list of bin-number[0-255], bin-content pairs

    // Create the whole matrix full of zeros. This then allows us to access any element directly
    repack2 = new Array(nRows);
    for (let i = 0; i < repack2.length; i++) {
	repack2[i] = new Array(rowLength-1).fill(0); // Creating an array of size rowLength and filled of 0
    }

    for(subMatrixIndex=0; subMatrixIndex<raw2.length; subMatrixIndex++){
	// Step through the subMatrix arrays one at a time.
	//

	// Calculate the subMatrix Coordinates
	subMatrixX = (Math.floor(subMatrixIndex%Math.floor(rowLength/subMatrixXlength)));
	subMatrixY = (Math.floor(subMatrixIndex/Math.floor(rowLength/subMatrixXlength)));
	subMatrixXbaseCoordinate = subMatrixX*subMatrixXlength;
	subMatrixYbaseCoordinate = subMatrixY*subMatrixYlength;
//	console.log('SubMatrix'+subMatrixIndex+'['+subMatrixX+']['+subMatrixY+']');

	// Process the current 16*16=256 values. Add them to the local matrix and the heatmap
	switch(raw2[subMatrixIndex][0]) {
	case 'empty':
	    // empty format, nothing to be done
	    break;
	case 'array':
	    // array format
	    // 256 z values are given in order.
	    // The values are given in the order of x0y0, x1y0, ..., x0y1, x1y1, ..., xmaxymax
	  //  console.log(raw2[subMatrixIndex]);
	    // type = raw2[subMatrixIndex].shift();

	    for(i=0; i<subMatrixYlength; i++){
		for(j=1; j<=subMatrixXlength; j++){ // j=0 entry is the subMatrix type
		    thisXindex = subMatrixXbaseCoordinate+j;
		    thisYindex = subMatrixYbaseCoordinate+i;
		    thisValue = raw2[subMatrixIndex][i*subMatrixXlength+j];
	//	    console.log('['+thisYindex+']['+thisXindex+']='+thisValue);
		    repack2[thisYindex][thisXindex] = thisValue;
		}
	    }

	    break;
	case 'list':
	    // list format
	    // The values are in pairs of [bin number within this submatrix, 0-255], then [z value]
	  //  console.log(raw2[subMatrixIndex]);
	   // type = raw2[subMatrixIndex].shift();
	    for(j=1; j<raw2[subMatrixIndex].length; j+=2){ // j=0 entry is the subMatrix type
		thisXindex = subMatrixXbaseCoordinate+Math.floor(raw2[subMatrixIndex][j]%subMatrixXlength);
		thisYindex = subMatrixYbaseCoordinate+Math.floor(raw2[subMatrixIndex][j]/subMatrixXlength);
		thisValue = raw2[subMatrixIndex][j+1];
	//	console.log('['+thisYindex+']['+thisXindex+']='+thisValue);
		repack2[thisYindex][thisXindex] = thisValue;
	    }
	    break;
	default:
	    // code block
	    // Unrecognized format
	    console.log('Unrecognized format!!!');
	    console.log(raw2[subMatrixIndex]);
	} // end of switch
    } // end of submatrices for loop
  //  console.log('Finshed unpacking');
  //  console.log(repack);
  //  console.log(repack2);

  // Remove channel zero noise and junk
  for(i=0; i<nRows; i++){
		repack2[i][0] = 0;
  }
  for(i=0; i<rowLength-1; i++){
		repack2[0][i] = 0;
  }

    // return the correctly formatted data
    return repack2;
}

function CRUDarrays(path, value, type){
    // delete the arrays at [path] from the odb, recreate them, and populate them with [value]

    var deletionURL, creationURL, updateURLs = [],
        i, typeIndex;

    //generate deletion URLs:
    deletionURL = dataStore.ODBhost + '?cmd=jdelete';
    for(i=0; i<path.length; i++){
        deletionURL += '&odb' + i + '=' + path[i];
    }

    //generate creation URLs:
    creationURL = dataStore.ODBhost + '?cmd=jcreate';
    for(i=0; i<path.length; i++){

        if(type[i]=='string')
            typeIndex = 12;
        else if(type[i]=='int')
            typeIndex = 7;
        else
            typeIndex = 9; // float, see mhttpd.js

        creationURL += '&odb' + i + '=' + path[i] + '&type' + i + '=' + typeIndex + '&arraylen' + i + '=' + value[i].length;
        if(typeIndex == 12)
            creationURL += '&strlen' + i + '=32';
    }

    //generate update urls:
    for(i=0; i<path.length; i++){
        updateURLs.push(dataStore.ODBhost + '?cmd=jset&odb=' + path[i] + '[*]&value=' + value[i].join() );
    }

    promiseScript(deletionURL).then(function(){
        promiseScript(creationURL).then(function(){
            var i;
            for(i=0; i<updateURLs.length; i++){
                pokeURL(updateURLs[i]);
            }
        })
    })
}

function pokeURL(url){
    // send a GET request to a given URL
    // to be used for poking MIDAS API endpoints (mostly jset) that expect a GET and don't have a CORS header (so the response can't be meaningfully validated)

    var req = new XMLHttpRequest();

    req.onerror = function(err) {
        console.log('The request to the following URL returned an error:');
        console.log(url);
        console.log(err)
    };

    req.open('GET', url);
    // Make the request
    req.send();
}

function inverseMatrix(_A) {
    // Credit to https://gist.github.com/husa/5652439
    var temp,
    N = _A.length,
    E = [];

    for (var i = 0; i < N; i++)
      E[i] = [];

    for (i = 0; i < N; i++)
      for (var j = 0; j < N; j++) {
        E[i][j] = 0;
        if (i == j)
          E[i][j] = 1;
      }

    for (var k = 0; k < N; k++) {
      temp = _A[k][k];

      for (var j = 0; j < N; j++)
      {
        _A[k][j] /= temp;
        E[k][j] /= temp;
      }

      for (var i = k + 1; i < N; i++)
      {
        temp = _A[i][k];

        for (var j = 0; j < N; j++)
        {
          _A[i][j] -= _A[k][j] * temp;
          E[i][j] -= E[k][j] * temp;
        }
      }
    }

    for (var k = N - 1; k > 0; k--)
    {
      for (var i = k - 1; i >= 0; i--)
      {
        temp = _A[i][k];

        for (var j = 0; j < N; j++)
        {
          _A[i][j] -= _A[k][j] * temp;
          E[i][j] -= E[k][j] * temp;
        }
      }
    }

    for (var i = 0; i < N; i++)
      for (var j = 0; j < N; j++)
        _A[i][j] = E[i][j];
    return _A;
}

function transposeMatrix(matrix) {
    console.log('helpers,transposeMatrix(matrix):'+matrix);
    const rows = matrix.length, cols = matrix[0].length;
  const grid = [];
  for (let j = 0; j < cols; j++) {
    grid[j] = Array(rows);
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      grid[j][i] = matrix[i][j];
    }
  }
  return grid;
}

function dotProductMatrix(a,b){
  let result = 0;
  for (let i = 0; i < 3; i++) {
    result += a[i] * b[i];
    console.log('result'+i+'='+result);
  }
    console.log('dotProductMatrix a,b,result'+a+' - '+b+' - '+result);
    return result;
}

function strncmp(a, b, n){
    return a.substring(0, n) == b.substring(0, n);
}

function compareX( a, b ) {
  if ( a.X < b.X ){
    return -1;
  }
  if ( a.X > b.X ){
    return 1;
  }
  return 0;
}

function formatNumberAndUncertaintyString(number,uncertainty){
    // Given a number and its uncertainty, return a string of the number with its uncertainty given in brackets where the value in brackets is the uncertainty in the final digits
    var requiredPrecision = 2;

    var uncertValue = Number.parseFloat(uncertainty).toExponential().replace(/^([0-9]+)\.?([0-9]+)?e[\+\-0-9]*$/g, "$1$2");
    var uncertNSigFigs = uncertValue.length;

    var string = number + '(' + Number.parseFloat(uncertainty).toPrecision(requiredPrecision) + ')';

    console.log(number);
    console.log(uncertainty);
    console.log(uncertValue);
    console.log(uncertNSigFigs);
    console.log(Number.parseFloat(uncertainty).toPrecision(requiredPrecision));

    //    return string;
    return;
}

// Taken from https://github.com/GRIFFINCollaboration/efficiencyCalculator/blob/gh-pages/scripts/efficiencyCalculator.js
// Modified to remove the upper and lower uncertainty values
// logEn expected for MeV units
function HPGeEfficiency(param, logEn){
    var i,
        logEff = 0,
        eff;

    // Do not calculate below 5keV
    if(logEn < Math.log(0.005)) return '0';

    // Build the efficiency value from the 8th order polynomial
    for(i=0; i<9; i++){
//	console.log('param '+param[i]+' to '+i+'th order for logEn = '+logEn);
//	console.log((parseFloat(param[i])*Math.pow(logEn,i)));
        logEff += parseFloat(param[i])*Math.pow(logEn,i);
    }

    // Convert back from logarithmic
    eff = Math.exp(logEff);
    return eff;
}
