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
                mungedResponse = req.response.replace(/NULL/g,'[]');
                mungedResponse = mungedResponse.replace(/\'/g, '\"');
                resolve(JSON.parse(mungedResponse));
                //resolve(JSON.parse(req.response.replace(/\'/g, '\"')));
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

function heartbeatXHR(url, errorMessage, callback, reject){
    //start the data fetching heartbeat that uses a XHR request
    //note the dataStore.heartbeat object needs to be defined first.

    url = dataStore.spectrumServer + '/?cmd=getSortStatus';
    errorMessage = "Problem getting Sort Status from analyzer server";
    callback = processSortStatus;
    XHR(url, errorMessage, callback, function(error){ErrorConnectingToAnalyzerServer(error)});
    
    window.clearTimeout(dataStore.heartbeatTimer)
    dataStore.heartbeatTimer = window.setTimeout(heartbeatXHR, dataStore.heartbeatInterval);
   
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
            reject(Error(req.statusText));
        }
    };

    // Handle network errors
    req.onerror = function() {
        reject(Error(errorMessage));
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
Array.prototype.fill = function(value, n){
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

	queryString = queryString.split('&');
	for(i=0; i<queryString.length; i++){
		value = queryString[i].split('=');
		urlData[value[0]] = value[1];
	}

    // Save the information to the dataStore
    // Save the hostname and port number
    dataStore.spectrumServer = 'http://'+urlData.backend+'.triumf.ca:'+urlData.port;
    
    // Copy the histogram URL arguments to the dataStore
    dataStore.histoFileDirectoryPath = urlData.histoDir;
    dataStore.histoFileName = urlData.histoFile;
    
    if(dataStore.histoFileDirectoryPath==undefined){
	// No directory for the histogram files has been provided in the URL, so we provide a default one
	dataStore.histoFileDirectoryPath = '/tig/grifstore0b/griffin/schedule140/Histograms';
    }
    if(dataStore.histoFileName==undefined){
	// No histogram filename has been provided in the URL, so we set the string back to nothing
	dataStore.histoFileName = '';
    }

    callback();
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
	  // Send the response to the callback function
          callback(req.response);
    }
  };

    // Handle network errors
    req.onerror = function() {
        reject(Error(errorMessage));
    };

    // Make the request
    req.send();

}


function processHistoFileList(payload){
    // receive the payload and split into an array of strings
    var thisPayload = payload.split(" ]")[0].split("[ \n")[1];
    
    // tidy up the strings to extract the list of midas files
    dataStore.histoFileList = thisPayload.split(" , \n ");

    // Sort the list in numberical and alphabetical order, then reverse the order so the newer files appear first (note this is not ideal for sub-runs)
    dataStore.histoFileList.sort();
    dataStore.histoFileList.reverse();

    // Set up the list of histo files
    setupHistoListSelect();
}

function setupHistoListSelect(){
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
    var string = 'Problem connecting to analyzer server: '+thisSpectrumServer+'<br>'+error;
    document.getElementById('histo-list-menu-div').innerHTML = string;
    document.getElementById('histo-list-menu-div').style.display= 'block';
    document.getElementById('histo-list-menu-div').style.width= '100%';
    document.getElementById('histo-list-menu-div').style.backgroundColor= 'red';
}

function processSpectrumList(payload){
    var SpectrumList = JSON.parse(payload);
    
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

			// Add this histogram to the items list in this subGroup of the topGroup
                        newGroup.subGroups[newGroup.subGroups.length-1].items.push(thisHistoTitle);			
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
    constructNewSpectrumMenu();
}

function constructNewSpectrumMenu(){
    // Clear any previous menu content
    if(document.getElementById('bs-example-navbar-collapse-1').innerHTML){
	document.getElementById('bs-example-navbar-collapse-1').innerHTML = '';
    }

    // build the menu based on these topGroups and subGroups
    // Need to ensure the constructore dataStore._plotList has been created.
    // If not then we need to wait for the initialization
    try{
	dataStore._plotList = new plotList('bs-example-navbar-collapse-1');
	dataStore._plotList.setup();
    }
    catch(err){
	setTimeout(constructNewSpectrumMenu(), 400);
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

    dataStore[eventName+'Listeners'].map(function(id){
        document.getElementById(id).dispatchEvent(evt);
    });   
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

