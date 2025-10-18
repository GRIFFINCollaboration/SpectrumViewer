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
    if(dataStore.xmltimeout != undefined){
      req.timeout = dataStore.xmltimeout;
    }else{
      //req.timeout = 5000; // time in milliseconds
      req.timeout = 0; // timeout is diabled
    }
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status

      var mungedResponse;

      if (req.status == 200) {
        // Response recieved
        // If a progress bar exists, update it
        if(typeof progressGGAngCorr !== "undefined"){
          let thisURLIndex = url.split("_bin")[1];
          let status = 5+(((thisURLIndex/dataStore.angularMatrices.length)/2.22)*100); // Divide by 2 because the download is only half the job
          let message = "complete";
          dataStore.ProgressValue = parseInt(status);
          document.getElementById('progressGGAngCorr').setAttribute('style', "width:" + status + "%" );
          document.getElementById('progressGGAngCorr').innerHTML = (status).toFixed(1) + "% " + message;
          console.log("Progress value = " + dataStore.ProgressValue);
        }

        // Resolve the promise with the response text parsed as JSON
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

function promiseBinaryURL(url){
  // promise to get response from <url>. Receive in binary format
  // thanks http://www.html5rocks.com/en/tutorials/es6/promises/

  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    if(dataStore.xmltimeout != undefined){
      req.timeout = dataStore.xmltimeout;
    }else{
      //req.timeout = 5000; // time in milliseconds
      req.timeout = 0; // timeout is diabled
    }
    req.open('GET', url);
    req.responseType = "arraybuffer";

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status

      if (req.status == 400) {
        const decoder = new TextDecoder();
        const responseString = decoder.decode(req.response);
        console.log(responseString);
        if(responseString.includes("Unknown Command")==true){
          console.log("Identified that the callbinaryspechandler command is not in this server. Conclude the grif-replay server is an old version.");

          var string = 'Please upgrade this instance of grif-replay to the latest version.<br>';
          document.getElementById('messageDivText').innerHTML = string;
          document.getElementById('messageDiv').style.display= 'block';

          // Could issue a new request using the old transfer method here.
          //var newURL = req.responseURL.replace("callbinaryspechandler","callspechandler");
        }
      }else if (req.status == 200) {
        // Response recieved

        // response parsed as binary
        const arrayBuffer = req.response;
        console.log("Received response from binary request:");

        if (arrayBuffer) {
          var byteArray = new Uint8Array(arrayBuffer);
          console.log("Created byteArray");

          // Extract the Name which has variable length. String termination is 0.
          var nameCodes = []; var i=0;
          while(byteArray[i]!=0 && i<81){ nameCodes[i] = byteArray[i]; i++; }
          var name = String.fromCharCode(...nameCodes);
          console.log("Name = "+name);
          i++;
          // Unpack the rest of the header (6 items). Each item is 16 bits.
          var XaxisLength = (byteArray[i+0] << 8) | byteArray[i+1];       // "XaxisLength" // 16 bits
          var YaxisLength = (byteArray[i+2] << 8) | byteArray[i+3];       // "YaxisLength" // 16 bits
          var numSubmatrices = (Math.ceil(XaxisLength/16)*Math.ceil(YaxisLength/16));
          var symmetrized = (byteArray[i+4] & 0x80) >> 7;                 // "symmetrized" // 1 bit
          var XaxisMin = ((byteArray[i+4] & 0x7F) << 8) | byteArray[i+5]; // "XaxisMin" // 15 bits
          var XaxisMax = (byteArray[i+6] << 8) | byteArray[i+7];          // "XaxisMax" // 16 bits
          var transfer_method = (byteArray[i+8] & 0x80) >> 7;             // "transfer method" // 1 bit
          var YaxisMin = ((byteArray[i+8] & 0x7F) << 8) | byteArray[i+9]; // "YaxisMin" // 15 bits
          var YaxisMax = (byteArray[i+10] << 8) | byteArray[i+11];        // "YaxisMax" // 16 bits
          console.log("XaxisLength = "+XaxisLength);
          console.log("YaxisLength = "+YaxisLength);
          console.log("symmetrized = "+symmetrized);
          console.log("XaxisMin/Max = "+XaxisMin+", "+XaxisMax);
          console.log("YaxisMin/Max = "+YaxisMin+", "+YaxisMax);
          console.log("transfer method = "+transfer_method);
          console.log(numSubmatrices+" submatrices.");
          i+=12; // Advance i to the start of the submatrix type header word

          // DEBUG
          console.log("DEBUG FLAGS after header= "+byteArray[i]+", "+byteArray[i+1]);
          i+=2;

          var submatrixType = [];
          if(transfer_method){
            // Transfer method 1, submatrix type is given for all submatrices
            console.log("Transfer Method 1 (Submatrix type for all submatrices)")
            // Unpack the submatrix type header word
            var thisType = 0;
            for(var j=0; j<numSubmatrices; j++){
              if(thisType==3){ submatrixType[j] = submatrixType[j-1]; continue; }
              switch((j%4)){
                case 0: thisType = (byteArray[i] & 0xC0)>>6;   break; // NOT WORKING in this position, Ge-Ge_110mm_angular_bin04
                case 1: thisType = (byteArray[i] & 0x30)>>4;   break; // NOT WORKING in this position, Ge-Ge_110mm_angular_bin05
                case 2: thisType = (byteArray[i] & 0x0C)>>2;   break;
                case 3: thisType = (byteArray[i] & 0x03); i++; break; // Works in this position, Ge-Ge_110mm_angular_bin01
                default:console.log("default case of switch"); break;
              }
              if(thisType==3){ submatrixType[j] = submatrixType[j-1]; if(j%4!=3){ i++; } continue; }
              else{ submatrixType[j] = thisType; }
            }
            // Determine number of each submatrix type
            var submatrixTypeCount = [0,0,0,0];
            for(var j=0; j<submatrixType.length; j++){
              submatrixTypeCount[submatrixType[j]]++;
            }
          //  console.log(submatrixTypeCount);
          //  console.log(submatrixType);
          }else{
            // Transfer method 0, Submatrix id numbers are given only for non-empty submatrices
            console.log("Transfer Method 0 (Submatrix id numbers and types)")
            // Determine the size required to store submatrix coordinates (transfer method 0)
            if( numSubmatrices <= 0x80 ){  coord_size = 1; } //  7-bit values (<128 = axis lengths: 176x176)
            else if( numSubmatrices <= 0x8000   ){  coord_size = 2; } // 15-bit values (256-32,767 = axis lengths: 2896x2896)
            else if( numSubmatrices <= 0x800000 ){  coord_size = 3; } // 23-bit values (32,768-8,388,607 = axis lengths: 46,336x46,336)
            else if( num_submatrices <= 0x80000000 ){  coord_size = 4; } // 31-bit values (8,388,608-2,147,483,647 = axis lengths: 741,440x741,440)
            else{ console.log("Histogram is too large!!! Requires "+numSubmatrices+" submatrices!"); return; }

            //console.log("Submatrix coordinate size is "+coord_size+" bytes");
            submatrixType.fillN(0,numSubmatrices); // Set all submatrices to zero type (empty)
            // Unpack count of non-empty submatrices
            var numFilledSubmatrices = 0;
            for(m=coord_size; m>0; m--){
              var bitshift = (8*(m-1));
              numFilledSubmatrices = numFilledSubmatrices | (byteArray[i] << bitshift );
              i++;
            }
            console.log("Number of non-empty submatrices = "+numFilledSubmatrices);
            for(k=0; k<numFilledSubmatrices; k++){
              thisType = (byteArray[i] & 0x80) >> 7;
              thisCoordinate = 0;
              for(m=coord_size; m>0; m--){
                var bitshift = (8*(m-1));
                if(m==coord_size){ thisCoordinate = (byteArray[i] & 0x7F ) << bitshift; }
                else{              thisCoordinate = thisCoordinate | (byteArray[i] << bitshift ); }
                i++;
              }
              //  console.log("i,k,thisType,coordinate = "+i+", "+k+", "+(thisType+1)+", "+thisCoordinate);
              submatrixType[thisCoordinate] = (thisType+1);
            }
            //  console.log(submatrixType);
          } // End of Header and submatrix types

          // DEBUG
          console.log("DEBUG FLAGS after submatrix map= "+byteArray[i]+", "+byteArray[i+1]);
          i+=2;

          // Stop the unpacking at the end of the header for now
        }else{
          console.log("Error receiving response in promiseBinaryURL()");
          console.log(req.response);
          reject(Error("Failed to unpack binary response."));
        }


        var payload = new Uint8Array( byteArray.slice(i) ); // Remove the header
        //keep the raw results around as an object in rawData
        // dense mode used for projections and other tasks
        // sparse mode used for (fast) plotting
        // dense mode, {zvalues[i][j]} where each number is the z height of the i,jth bin.
        // sparse mode, {xBins: n, yBins: n, x: [x1, x2, ...], y: [y1, y2, ...], z: [z1, z2, ...]}
        // Reconstruct the 2d histogram object
        var thisMatrix = {
          "name" : name, "XaxisLength" : XaxisLength, "YaxisLength" : YaxisLength,
          "symmetrized" : symmetrized,
          "XaxisMin" : XaxisMin, "XaxisMax" : XaxisMax,
          "YaxisMin" : YaxisMin, "YaxisMax" : YaxisMax,
          "submatrixType" : submatrixType,
          "dataBinary" : payload, // Save the arrayBuffer from the end of the header here for unpacking later
          "data2" : []                // Leave this empty, it will be filled with unpacked data
        };
        var this2dKey = dataStore.histoFileName.split('.')[0] + ':' + name;
        dataStore.rawData[this2dKey] = thisMatrix;

        // Update the progress bar by one task
        updateProgressBar(1);

        // Resolve the promise
        //fetchCallback();
        let resolveString = "{\"binaryName\":\""+this2dKey+"\"}";
        resolve(JSON.parse(resolveString));
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

function unpackBinaryMatrixData(key,outputRaw,outputDense,outputSparse,outputDelete){
  // Unpack the matrix data received as a binary transfer
  // Optionally save this in three places in the required form

  if(outputRaw == null){ outputRaw = false; }
  if(outputDense == null){ outputDense = false; }
  if(outputSparse == null){ outputSparse = false; }
  if(outputDelete == null){ outputDelete = false; }
  if(outputRaw==false && outputDense==false && outputSparse==false){
    // No output requested so quit
    console.log("No output requested for "+key+" in unpackBinaryMatrixData, so no processing done.");
    return;
  }
  console.log(dataStore.rawData);
  console.log("unpacking binary data for "+key);
  console.log("Output flags [Raw/Dense/Sparse/Delete]: "+outputRaw+","+outputDense+","+outputSparse+","+outputDelete);
  const byteArray = new Uint8Array(dataStore.rawData[key].dataBinary);
  const submatrixType = dataStore.rawData[key].submatrixType;
  var XaxisLength = dataStore.rawData[key].XaxisLength;
  var YaxisLength = dataStore.rawData[key].YaxisLength;
  var symmetrized = dataStore.rawData[key].symmetrized;
  var XaxisMin = dataStore.rawData[key].XaxisMin;
  var XaxisMax = dataStore.rawData[key].XaxisMax;
  var YaxisMin = dataStore.rawData[key].YaxisMin;
  var YaxisMax = dataStore.rawData[key].YaxisMax;
  var i = 0;

// Create space for this histogram data
var denseData = [];
for(m=0; m<YaxisLength; m++){ denseData[m] = [];
  for(k=0; k<XaxisLength; k++){ denseData[m][k] = 0; }
}
var fourByteArray = new Uint32Array(YaxisLength*XaxisLength); // place to store the dense data format (compressed with respect to a standard array)
var sparseData = {
  xBins: XaxisLength, yBins: YaxisLength,
  x: [], y: [], z: []
};

// Now unpack the data
var subMatrixXlength = 16;
var subMatrixYlength = 16;

for(thisSubmatrixIndex=0; thisSubmatrixIndex<submatrixType.length; thisSubmatrixIndex++){
  // Calculate the subMatrix Coordinates
  var subMatrixX = (Math.floor(thisSubmatrixIndex%Math.floor(XaxisLength/subMatrixXlength)));
  var subMatrixY = (Math.floor(thisSubmatrixIndex/Math.floor(XaxisLength/subMatrixXlength)));
  var subMatrixXbaseCoordinate = subMatrixX*subMatrixXlength;
  var subMatrixYbaseCoordinate = subMatrixY*subMatrixYlength;

  if(i>=byteArray.length){
    // Reached the end of the data, but not necessarily the end of the submatrices if the remainder are empty, lets check
    for(var j=thisSubmatrixIndex; j<submatrixType.length; j++){
      if(submatrixType[j]!=0){
        console.log("PROBLEM: Reached the end of the data but not all remaining submatrices are Empty type!!");
       console.log("i="+i+" for byteArray length of "+byteArray.length);
       console.log("thisSubmatrixIndex="+thisSubmatrixIndex+", j="+j+" with length "+submatrixType.length);
       console.log(submatrixType);
      }
    }
    break;
  }

  switch(submatrixType[thisSubmatrixIndex]){
    case 0: break; // Empty type
    case 1: // List type
  //  console.log("List type ["+thisSubmatrixIndex+"]: ["+subMatrixXbaseCoordinate+"-"+(subMatrixXbaseCoordinate+16)+"], ["+subMatrixYbaseCoordinate+"-"+(subMatrixYbaseCoordinate+16)+"]");
    // Header is Four 8-bit characters representing the count of each data size values; 8, 16, 24, 32 bits
    // Coordinates given as 8-bit characters in the order of 8, 16, 24, 32 bit value sizes
    // Data values are given in order of size type (8, 16, 24, 32 bit), in the order of the coordinates given.
    var dataCount = [0,0,0,0]; var coordinates = [];
    dataCount[0] = byteArray[i]; i++;
    if(dataCount[0]<254){
      dataCount[1] = byteArray[i]; i++;
      if(dataCount[0]+dataCount[1]<254){
        dataCount[2] = byteArray[i]; i++;
        if(dataCount[0]+dataCount[1]+dataCount[2]<254){
          dataCount[3] = byteArray[i]; i++;
        }
      }
    }
    if(dataCount[0] == undefined){
      console.log("dataCount[0] = undefined");
      console.log("i="+i+" for byteArray length of "+byteArray.length);
      continue;
    }
  //  console.log("Data counts: "+dataCount[0]+", "+dataCount[1]+", "+dataCount[2]+", "+dataCount[3]);
  //  var debug=0;
    if(dataCount[1]>0){ debug=1; }
    // Extract coordinates
    for(var m=0; m<4; m++){
      for(j=0; j<dataCount[m]; j++){
        coordinates.push( byteArray[i] ); i++;
      }
    }
    // Extract values
    var index=0;
    for(var thisSize=0; thisSize<4; thisSize++){
      var num=thisSize+1;
      for(j=0; j<dataCount[thisSize]; j++){
        thisX=subMatrixXbaseCoordinate+(coordinates[index]%subMatrixXlength);
        thisY=subMatrixYbaseCoordinate+parseInt(coordinates[index]/subMatrixXlength);
        value=0;
        for(m=num; m>0; m--){
          var bitshift = (8*(m-1));
          value = value | (byteArray[i] << bitshift );
          i++;
        }
        if(isNaN(thisX) || isNaN(thisY)){
          console.log("Base coordinates: "+subMatrixXbaseCoordinate+","+subMatrixYbaseCoordinate);
          console.log(j+","+coordinates[index]+","+thisX+","+thisY+": "+value);
        }
      //  if(debug){ console.log(j+","+coordinates[index]+","+thisX+","+thisY+": "+value); }
        if(value>0){
          denseData[thisY][thisX] = value; // Save dense data object
          fourByteArray[(thisY*XaxisLength)+thisX] = value; // Save dense data object
          sparseData.x.push(thisX); // Save sparse data object
          sparseData.y.push(thisY); // Save sparse data object
          sparseData.z.push(value); // Save sparse data object
          if(symmetrized){
            denseData[thisX][thisY] = value; // Save dense data object
            fourByteArray[(thisX*XaxisLength)+thisY] = value; // Save dense data object
            sparseData.x.push(thisY); // Save sparse data object
            sparseData.y.push(thisX); // Save sparse data object
            sparseData.z.push(value); // Save sparse data object
          }
        }
        index++;
      }
    }
    break;
    case 2: // Array type
    //console.log("Array type: ["+subMatrixXbaseCoordinate+"-"+(subMatrixXbaseCoordinate+16)+"], ["+subMatrixYbaseCoordinate+"-"+(subMatrixYbaseCoordinate+16)+"]");
    // Header first which is a single 8-bit character
    // 2 bits indicating the data size for the four subsubmatrices of 64 values each.
    // Array types, 0 (8-bit), 1 (16-bit), 2 (24-bit), 3 (32-bit)
    // The data values follow with the spcified size
    var dataSize = [];
    // Unpack the submatrix array header of data sizes
    // Four groups of 64 values each have the stated size
    dataSize[0] = ((byteArray[i] & 0xC0)>>6)+1;
    dataSize[1] = ((byteArray[i] & 0x30)>>4)+1;
    dataSize[2] = ((byteArray[i] & 0x0C)>>2)+1;
    dataSize[3] = ((byteArray[i] & 0x03)   )+1; // Add one to each type so it is a count of characters
    i++;
    for(j=0; j<256; j++){ // Now unpack the data values
      thisX=subMatrixXbaseCoordinate+(j%subMatrixXlength);
      thisY=subMatrixYbaseCoordinate+parseInt(j/subMatrixXlength);
      value=0;
      for(m=dataSize[parseInt(j/64)]; m>0; m--){
        var bitshift = (8*(m-1));
        value = value | (byteArray[i] << bitshift );
        i++;
      }
      //  console.log(j+","+thisX+","+thisY+": "+value);
      if(value>0){
        denseData[thisY][thisX] = value; // Save dense data object
        fourByteArray[(thisY*XaxisLength)+thisX] = value; // Save dense data object
        sparseData.x.push(thisX); // Save sparse data object
        sparseData.y.push(thisY); // Save sparse data object
        sparseData.z.push(value); // Save sparse data object
        if(symmetrized){
          denseData[thisX][thisY] = value; // Save dense data object
          fourByteArray[(thisX*XaxisLength)+thisY] = value; // Save dense data object
          sparseData.x.push(thisY); // Save sparse data object
          sparseData.y.push(thisX); // Save sparse data object
          sparseData.z.push(value); // Save sparse data object
        }
      }
    }
    break;
    default: console.log("Unrecognized submatrix type "+submatrixType[thisSubmatrixIndex]+" for submatrix "+thisSubmatrixIndex); break;
  }
}

//keep the raw results around as an object in rawData
// dense mode used for projections and other tasks
// sparse mode used for (fast) plotting
// dense mode, {zvalues[i][j]} where each number is the z height of the i,jth bin.
// sparse mode, {xBins: n, yBins: n, x: [x1, x2, ...], y: [y1, y2, ...], z: [z1, z2, ...]}
// Reconstruct the 2d histogram object
var thisMatrix = {
  "name" : name, "XaxisLength" : XaxisLength, "YaxisLength" : YaxisLength,
  "symmetrized" : symmetrized,
  "XaxisMin" : XaxisMin, "XaxisMax" : XaxisMax,
  "YaxisMin" : YaxisMin, "YaxisMax" : YaxisMax,
  "submatrixType" : submatrixType,
  "dataBinary" : byteArray,
  "data2" : denseData,
  //"data32bit" : fourByteArray
  //"data2" : fourByteArray
};
if(outputRaw){ dataStore.rawData[key].data2 = denseData; }   //  dense mode data
if(outputDense){ // Used in projection functions
  if(!dataStore.hm._raw){ dataStore.hm._raw = []; }
  if(!dataStore.hm.raw){ dataStore.hm.raw = []; }
  dataStore.hm._raw = denseData;
  dataStore.hm.raw  = denseData;
}
if(outputSparse){ dataStore.sparseData[key] = sparseData; } // sparse mode data
if(outputDelete){ delete dataStore.rawData[key].dataBinary; } // delete the binaryBuffer data

}

async function promiseUnpackedBinaryMatrixData(key){
  // Unpack the matrix data received as a binary transfer only to the heatmap object used by the projection functions


  // Return a new promise.
  return new Promise(function(resolve) {

    console.log("Promise unpacking binary data for "+key);
    const byteArray = new Uint8Array(dataStore.rawData[key].dataBinary);
    const submatrixType = dataStore.rawData[key].submatrixType;
    var XaxisLength = dataStore.rawData[key].XaxisLength;
    var YaxisLength = dataStore.rawData[key].YaxisLength;
    var symmetrized = dataStore.rawData[key].symmetrized;
    var XaxisMin = dataStore.rawData[key].XaxisMin;
    var XaxisMax = dataStore.rawData[key].XaxisMax;
    var YaxisMin = dataStore.rawData[key].YaxisMin;
    var YaxisMax = dataStore.rawData[key].YaxisMax;
    var i = 0;

    // Create space for this histogram data
    var denseData = [];
    for(m=0; m<YaxisLength; m++){ denseData[m] = [];
      for(k=0; k<XaxisLength; k++){ denseData[m][k] = 0; }
    }

    // Now unpack the data
    var subMatrixXlength = 16;
    var subMatrixYlength = 16;

    for(thisSubmatrixIndex=0; thisSubmatrixIndex<submatrixType.length; thisSubmatrixIndex++){
      // Calculate the subMatrix Coordinates
      var subMatrixX = (Math.floor(thisSubmatrixIndex%Math.floor(XaxisLength/subMatrixXlength)));
      var subMatrixY = (Math.floor(thisSubmatrixIndex/Math.floor(XaxisLength/subMatrixXlength)));
      var subMatrixXbaseCoordinate = subMatrixX*subMatrixXlength;
      var subMatrixYbaseCoordinate = subMatrixY*subMatrixYlength;

      switch(submatrixType[thisSubmatrixIndex]){
        case 0: break; // Empty type
        case 1: // List type
        // Header is Four 8-bit characters representing the count of each data size values; 8, 16, 24, 32 bits
        // Coordinates given as 8-bit characters in the order of 8, 16, 24, 32 bit value sizes
        // Data values are given in order of size type (8, 16, 24, 32 bit), in the order of the coordinates given.
        var dataCount = [0,0,0,0]; var coordinates = [];
        dataCount[0] = byteArray[i]; i++;
        if(dataCount[0]<254){
          dataCount[1] = byteArray[i]; i++;
          if(dataCount[0]+dataCount[1]<254){
            dataCount[2] = byteArray[i]; i++;
            if(dataCount[0]+dataCount[1]+dataCount[2]<254){
              dataCount[3] = byteArray[i]; i++;
            }
          }
        }
        //console.log("Data counts: "+dataCount[0]+", "+dataCount[1]+", "+dataCount[2]+", "+dataCount[3]);
        // Extract coordinates
        for(var m=0; m<4; m++){
          for(j=0; j<dataCount[m]; j++){
            coordinates.push( byteArray[i] ); i++;
          }
        }
        // Extract values
        var index=0;
        for(var thisSize=0; thisSize<4; thisSize++){
          var num=thisSize+1;
          for(j=0; j<dataCount[thisSize]; j++){
            thisX=subMatrixXbaseCoordinate+(coordinates[index]%subMatrixXlength);
            thisY=subMatrixYbaseCoordinate+parseInt(coordinates[index]/subMatrixXlength);
            value=0;
            for(m=num; m>0; m--){
              var bitshift = (8*(m-1));
              value = value | (byteArray[i] << bitshift );
              i++;
            }
            if(isNaN(thisX) || isNaN(thisY)){
              console.log("Base coordinates: "+subMatrixXbaseCoordinate+","+subMatrixYbaseCoordinate);
              console.log(j+","+coordinates[index]+","+thisX+","+thisY+": "+value);
            }
            //console.log(j+","+coordinates[index]+","+thisX+","+thisY+": "+value);
            if(value>0){
              denseData[thisY][thisX] = value; // Save dense data object
              if(symmetrized){ denseData[thisX][thisY] = value; } // Save dense data object
            }
            index++;
          }
        }
        break;
        case 2: // Array type
        //  console.log("Array type: "+subMatrixXbaseCoordinate+", "+subMatrixYbaseCoordinate);
        // Header first which is a single 8-bit character
        // 2 bits indicating the data size for the four subsubmatrices of 64 values each.
        // Array types, 0 (8-bit), 1 (16-bit), 2 (24-bit), 3 (32-bit)
        // The data values follow with the spcified size
        var dataSize = [];
        // Unpack the submatrix array header of data sizes
        // Four groups of 64 values each have the stated size
        dataSize[0] = ((byteArray[i] & 0xC0)>>6)+1;
        dataSize[1] = ((byteArray[i] & 0x30)>>4)+1;
        dataSize[2] = ((byteArray[i] & 0x0C)>>2)+1;
        dataSize[3] = ((byteArray[i] & 0x03)   )+1; // Add one to each type so it is a count of characters
        i++;
        for(j=0; j<256; j++){ // Now unpack the data values
          thisX=subMatrixXbaseCoordinate+(j%subMatrixXlength);
          thisY=subMatrixYbaseCoordinate+parseInt(j/subMatrixXlength);
          value=0;
          for(m=dataSize[parseInt(j/64)]; m>0; m--){
            var bitshift = (8*(m-1));
            value = value | (byteArray[i] << bitshift );
            i++;
          }
          //  console.log(j+","+thisX+","+thisY+": "+value);
          if(value>0){
            denseData[thisY][thisX] = value; // Save dense data object
            if(symmetrized){ denseData[thisX][thisY] = value; } // Save dense data object
          }
        }
        break;
        default: console.log("Unrecognized submatrix type "+submatrixType[thisSubmatrixIndex]+" for submatrix "+thisSubmatrixIndex); break;
      }
    }

    // Save the uncompressed data to the 2d histogram object used by project functions
    dataStore.hm._raw = denseData;

    // resolve the promise
    resolve("Success!");
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
    if(dataStore.xmltimeout != undefined){
      req.timeout = dataStore.xmltimeout;
    }else{
      //req.timeout = 5000; // time in milliseconds
      req.timeout = 0; // timeout is diabled
    }
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
    if(dataStore.xmltimeout != undefined){
      req.timeout = dataStore.xmltimeout;
    }else{
      //req.timeout = 5000; // time in milliseconds
      req.timeout = 0; // timeout is diabled
    }
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Clear any previosuly reported errors
        if(req.responseURL.split("cmd=")[1] != "getSortStatus"){
          ClearErrorConnectingToAnalyzerServer();
        }
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
  if(dataStore.xmltimeout != undefined){
    req.timeout = dataStore.xmltimeout;
  }else{
    //req.timeout = 5000; // time in milliseconds
    req.timeout = 0; // timeout is diabled
  }
  req.open('GET', url);

  req.onload = function() {
    // This is called even on 404 etc
    // so check the status
    if (req.status == 200) {
      if(req.responseURL.split("cmd=")[1] != "getSortStatus"){
        ClearErrorConnectingToAnalyzerServer();
      }
      callback(req.response);
    }
    else {
      //reject(ErrorReceivedFromAnalyzerServer(req.response));
      ErrorReceivedFromAnalyzerServer(req.response);
      if(reject != undefined){ reject(req.response); }
    }
  };

  // Handle server error responses
  req.onerror = function() {
    //reject(ErrorReceivedFromAnalyzerServer(req.response));
    ErrorReceivedFromAnalyzerServer(req.response);
    if(reject != undefined){ reject(req.response); }
  };

  // Handle network errors
  req.ontimeout = function(){
    ErrorConnectingToAnalyzerServer("Server not responding");
    reject(ErrorConnectingToAnalyzerServer("Server not responding"));
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
  if(urlData.backend != undefined){
    if(urlData.backend == "localhost"){
      dataStore.spectrumServer = 'http://'+urlData.backend+":"+urlData.port;
    }else{
      dataStore.spectrumServer = 'http://'+urlData.backend+'.triumf.ca:'+urlData.port;
    }
    dataStore.spectrumServerBackend = urlData.backend;
    dataStore.spectrumServerPort = urlData.port;
  }else{
    if(urlData.analyzerBackend == "localhost"){
      dataStore.spectrumServer = 'http://'+urlData.analyzerBackend+":"+urlData.analyzerPort;
    }else{
      dataStore.spectrumServer = 'http://'+urlData.analyzerBackend+'.triumf.ca:'+urlData.analyzerPort;
    }

    // Save the information to the dataStore
    // Save the hostname and port number for writing the ODB parameters
    if(urlData.ODBHostBackend == "localhost"){
      dataStore.ODBhost = 'http://'+urlData.ODBHostBackend+":"+urlData.ODBHostPort;
    }else{
      dataStore.ODBhost = 'http://'+urlData.ODBHostBackend+'.triumf.ca:'+urlData.ODBHostPort;
    }
  }

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
  if(urlData.histoFile){
    dataStore.histoFileName = urlData.histoFile;
    dataStore.histoAutoLoad = true;
  }

  if(callback)
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
    if(urlData.backend != undefined){
      if(urlData.backend == "localhost"){
        dataStore.spectrumServer = 'http://'+urlData.backend+":"+urlData.port;
      }else{
        dataStore.spectrumServer = 'http://'+urlData.backend+'.triumf.ca:'+urlData.port;
      }
      dataStore.spectrumServerBackend = urlData.backend;
      dataStore.spectrumServerPort = urlData.port;
    }else{
      if(urlData.analyzerBackend == "localhost"){
        dataStore.spectrumServer = 'http://'+urlData.analyzerBackend+":"+urlData.analyzerPort;
      }else{
        dataStore.spectrumServer = 'http://'+urlData.analyzerBackend+'.triumf.ca:'+urlData.analyzerPort;
      }

      // Save the information to the dataStore
      // Save the hostname and port number for writing the ODB parameters
      if(urlData.ODBHostBackend == "localhost"){
        dataStore.ODBhost = 'http://'+urlData.ODBHostBackend+":"+urlData.ODBHostPort;
      }else{
        dataStore.ODBhost = 'http://'+urlData.ODBHostBackend+'.triumf.ca:'+urlData.ODBHostPort;
      }
    }

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
    if(urlData.histoFile){
      dataStore.histoFileName = urlData.histoFile;
      dataStore.histoAutoLoad = true;
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
  var url = dataStore.spectrumServer + '/?cmd=viewConfig';
  XHR(url, "Problem getting Config file from analyzer server", processConfigFile, function(error){ErrorConnectingToAnalyzerServer(error)});
}

function viewConfigOfHisto(histo){

  // Format check for the data file
  HistoFileDirectory = dataStore.histoFileDirectoryPath;
  if(HistoFileDirectory[HistoFileDirectory.length]!='/'){
    HistoFileDirectory += '/';
  }
  filename = HistoFileDirectory + histo;

  // get the config file from the server/ODB for this histogram
  url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
  XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForRunDetails, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function getMidasFileListFromServer(){
  // use a one-off XHR request with callback for getting the list of MIDAS files
  var directoryPath = dataStore.midasFileDataDirectoryPath;
  if(directoryPath == undefined){ directoryPath = dataStore.midasFileDataDirectoryPath = dataStore.histoFileDirectoryPath; }
  var url = dataStore.spectrumServer + '/?cmd=getDatafileList&dir='+dataStore.midasFileDataDirectoryPath;
  XHR(url, "Problem getting list of MIDAS files from analyzer server", processMidasFileList, );

}

function getMidasFileDetailsFromServer(){
  // use a one-off XHR request with callback for getting the list of MIDAS files
  var url = dataStore.spectrumServer + '/?cmd=getDatafileDetails&dir='+dataStore.midasFileDataDirectoryPath;
  XHR(url, "Problem getting details of MIDAS files from analyzer server", processMidasFileDetails, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function getHistoFileListFromServer(){
  // use a one-off XHR request with callback for getting the list of Histo files
  var url = dataStore.spectrumServer + '/?cmd=getHistofileList&dir='+dataStore.histoFileDirectoryPath;
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

  // Update the HTML elements with these values
  if(document.getElementById('DataDirectoryInput')){ document.getElementById('DataDirectoryInput').value = dataStore.midasFileDataDirectoryPath; }
  if(document.getElementById('HistoDirectoryInputSorting')){ document.getElementById('HistoDirectoryInputSorting').value = dataStore.histoFileDirectoryPath; }
  if(document.getElementById('HistoDirectoryInputViewer')){ document.getElementById('HistoDirectoryInputViewer').value = dataStore.histoFileDirectoryPath; }
  if(document.getElementById('ConfigDirectoryInput')){ document.getElementById('ConfigDirectoryInput').value = dataStore.configFileDataDirectoryPath; }

  // Record the timestamp of when this config file is received
  dataStore.configFileTimestamp = Math.floor(Date.now() / 1000);
  //console.log('Save timestamp as '+dataStore.configFileTimestamp);

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
  dataStore.currentCalibrations = [];
  for(var i=0; i<dataStore.Configs.Analyzer[4].Calibrations.length; i++){
    dataStore.currentCalibrations.push(dataStore.Configs.Analyzer[4].Calibrations[i]);
  }

  // Update content that involves the config file
  dispatcher({}, 'requestHistogramsRefresh');
  dispatcher({}, 'requestConfigCalibrationsRefresh');
}

function processConfigFileForCalibrations(payload){

  // Unpack the response from the server into a local variable
  var thisConfig = JSON.parse(payload);

  // We only care about the Calbrations in this app
  dataStore.Config = thisConfig.Analyzer[4].Calibrations;
}

function processMidasFileList(payload){

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

  // Update content that involves the File Details
  dispatcher({}, 'midasFileDetailsAvailable');
}

function processHistoFileList(payload){

  // receive the payload and split into an array of strings
  var thisPayload = payload.split(" ]")[0].split("[ \n")[1];

  // Protect against an empty response
  if(thisPayload == undefined){
    dataStore.histoFileList = [];
  }

  // tidy up the strings to extract the list of midas files
  dataStore.histoFileList = thisPayload.split(" , \n ");

  // Sort the list in numberical and alphabetical order, then reverse the order so the newer files appear first (note this is not ideal for sub-runs)
  dataStore.histoFileList.sort();
  dataStore.histoFileList.reverse();

  // Update content that involves the Histogram list
  dispatcher({}, 'requestViewerRefresh');
  dispatcher({}, 'requestSortingRefresh');

  // Set up the list of histo files
  setupHistoListSelect();

  // EfficiencyFitter app still uses a unique function defined in efficiencyFitter.js. Note different function name 'Selects'
  if(typeof(setupHistoListSelects)!='undefined'){ setupHistoListSelects(); }
}


function setupHistoListSelect(){
  // Used to populate either the histo-list-menu-div or the histoChoiceBar

  // Only proceed if the histo-list-menu-div exists
  if(document.getElementById('histo-list-menu-div')){

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

  // Populate the histo Choice bar in apps
  if(typeof(dataStore.histoChoiceBarContents)!="undefined"){
    for(var i=0; i<dataStore.histoChoiceBarContents.length; i++){
      var thisTitle = dataStore.histoChoiceBarContents[i];
      var rowIndex = Math.floor(i/2);

      if(i%2==0){
        // Inject the Container Div (a row) for this pair of selects.
        var newDiv = document.createElement("div");
        newDiv.id = 'histoChoiceDivRow'+rowIndex;
        newDiv.class = 'col-md-12';
        document.getElementById('histoChoiceDir').appendChild(newDiv);
      }

      // Inject the Div for this label and select
      var newDiv = document.createElement("div");
      newDiv.id = 'histoChoice'+thisTitle;
      newDiv.class = 'col-md-4';
      document.getElementById('histoChoiceDivRow'+rowIndex).appendChild(newDiv);

      // Add the title text for the label
      var newLabel = document.createElement("label");
      newLabel.for = 'HistoListSelect'+thisTitle;
      newLabel.id = 'HistoListSelectLabel'+thisTitle;
      newLabel.innerHTML = thisTitle+' Histogram file: ';
      document.getElementById('histoChoice'+thisTitle).appendChild(newLabel);

      // Create a select input for the histo file list
      var newSelect = document.createElement("select");
      newSelect.id = 'HistoListSelect'+thisTitle;
      newSelect.name = 'HistoListSelect'+thisTitle;
      document.getElementById('histoChoice'+thisTitle).appendChild(newSelect);

      // Add the list of histo files as the options
      thisSelect = document.getElementById('HistoListSelect'+thisTitle);
      if(thisTitle == "11Be" || thisTitle == "133Ba"){
        thisSelect.add( new Option("Do not include "+thisTitle, "exclude") );
      }
      for(var j=0; j<dataStore.histoFileList.length; j++){
        thisSelect.add( new Option(dataStore.histoFileList[j], dataStore.histoFileList[j]) );
      }

      // Fire the onchange event for the select with the default value to set it
      //document.getElementById('HistoListSelect'+thisTitle).onchange();
    }
  }

}


function addTitlesToHistoListSelect(){
  // Add run titles to the drop-down select options for selecting histogram files.
  // This should be set as a listener for the event 'midasFileDetailsAvailable'
  // There are two auto methods of building the group of selects; dataStore.sourceInfo should be considered depricated and will be superceded with dataStore.histoChoiceBarContents.
  // but both are supported here still.

  var titles = [];

  // Populate the histo Choice bar in apps
  if(typeof(dataStore.histoChoiceBarContents)!="undefined"){

    // loop over all selects
    for(i=0; i<dataStore.histoChoiceBarContents.length; i++){
      titles.push(dataStore.histoChoiceBarContents[i]);
    }
  }

  // Populate the Selects defined through the dataStore.sourceInfo object
  if(typeof(dataStore.sourceInfo)!="undefined"){

    var keys = Object.keys(dataStore.sourceInfo);
    // loop over all sources
    for(i=0; i<keys.length; i++){
      titles.push(dataStore.sourceInfo[keys[i]].title);
    }
  }

  // Now loop over all selects to add the run titles to the options
  for(i=0; i<titles.length; i++){
    var thisTitle = titles[i];
    numOptions = document.getElementById('HistoListSelect'+thisTitle).options.length;
    for(var j=0; j<numOptions; j++){

      var thisRunName = document.getElementById('HistoListSelect'+thisTitle).options[j].text.split(".")[0];

      // Find the details for this run
      // With this method subruns do not get a title added because they have an extra "_000" in their run title. Need a modified method like .includes added to .indexOf
      var num = dataStore.midasRunList.map(function(e) { return e.RunName; }).indexOf(thisRunName);

      // Only add the run title if this run number was found in the run details list
      if(num>=0){
        document.getElementById('HistoListSelect'+thisTitle).options[j].text = thisRunName+'.tar, '+dataStore.midasRunList[num].RunTitle;
      }
    }
  }
}

function ErrorConnectingToAnalyzerServer(error){
  var string = 'Problem connecting to analyzer server: '+dataStore.spectrumServer+'<br>'+error;
  document.getElementById('messageDivText').innerHTML = string;
  document.getElementById('messageDiv').style.display= 'block';

  // Slow down the heartbeat if the server is not responding
  dataStore.heartbeatTimer = dataStore.heartbeatIntervalERRORvalue;
}

function ClearErrorConnectingToAnalyzerServer(){
  // Clear the error div and message
  document.getElementById('messageDiv').style.display= 'none';

  // Resume the normal heartbeat if the server is responding
  dataStore.heartbeatTimer = dataStore.heartbeatIntervalDEFAULTvalue;
}

function ErrorReceivedFromAnalyzerServer(errorText){
  var string = 'Error returned from server ['+dataStore.spectrumServer+']:<br>'+errorText;
  document.getElementById('messageDivText').innerHTML = string;
  document.getElementById('messageDiv').style.display= 'block';
}

function processSpectrumList(payload,callback){

  // We have had problems with corruption in the spectrum list. So protect against errors here
  try{
    var SpectrumList = JSON.parse(payload);
  }
  catch(err){
    console.log('Problem with format of the Spectrum list provided by the server for histogram file, '+dataStore.histoFileName);
    if(document.getElementById('navbar-content-div')){
      document.getElementById('navbar-content-div').innerHTML = 'Error: Problem getting the Spectrum list from the server.';
      document.getElementById('navbar-content-div').style.color = 'black';
    }
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

    // Add the Projections subfolder for the gating tool
    // Only needed if there are 2d objects in this spectrum list
    if(newGroup.name == "Coinc"){
      newSubgroup = {
        "subname": 'Projections',
        "id": 'proj',
        "items": []
      }
      // Add this subGroup to the topGroup
      newGroup.subGroups.push(newSubgroup);
    }

    // Add this new topGroup to the topGroups object
    topGroups.push(newGroup)
  }


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
    document.getElementById('navbar-content-div').innerHTML = 'Error: The spectrum menu failed to load correctly.';
    document.getElementById('navbar-content-div').style.color = 'black';
    return;
  }

  // Clear any previous menu content
  try{
    document.getElementById('navbar-content-div').innerHTML = '';
  }
  catch(err){
    //  console.log(err);
    return;
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
    const thisTimeout = setTimeout(function() { constructNewSpectrumMenu(); }, 500);
  }
}

/*
function setupHistoListSelect(){

// Remove the select if it already exists
try{
document.getElementById('HistoListSelect').remove();
document.getElementById('HistoListSelectLabel').remove();
}
catch(err){ }

if(typeof(dataStore.histoChoiceBarContents)!="undefined"){
for(var i=0; i<dataStore.histoChoiceBarContents.length; i++){
var thisTitle = dataStore.histoChoiceBarContents[i];
var rowIndex = Math.floor(i/2);

if(i%2==0){
// Inject the Container Div (a row) for this pair of selects.
var newDiv = document.createElement("div");
newDiv.id = 'histoChoiceDivRow'+rowIndex;
newDiv.class = 'col-md-12';
document.getElementById('histoChoiceDir').appendChild(newDiv);
}

// Inject the Div for this label and select
var newDiv = document.createElement("div");
newDiv.id = 'histoChoice'+thisTitle;
newDiv.class = 'col-md-4';
document.getElementById('histoChoiceDivRow'+rowIndex).appendChild(newDiv);


// Add the title text for the label
var newLabel = document.createElement("label");
newLabel.for = 'HistoListSelect'+thisTitle;
newLabel.id = 'HistoListSelectLabel'+thisTitle;
newLabel.innerHTML = thisTitle+' Histogram file: ';
document.getElementById('histoChoice'+thisTitle).appendChild(newLabel);

// Create a select input for the histo file list
var newSelect = document.createElement("select");
newSelect.id = 'HistoListSelect'+thisTitle;
newSelect.name = 'HistoListSelect'+thisTitle;
document.getElementById('histoChoice'+thisTitle).appendChild(newSelect);

// Add the list of histo files as the options
thisSelect = document.getElementById('HistoListSelect'+thisTitle);
if(thisTitle == "11Be" || thisTitle == "133Ba"){
thisSelect.add( new Option("Do not include "+thisTitle, "exclude") );
}
for(var j=0; j<dataStore.histoFileList.length; j++){
thisSelect.add( new Option(dataStore.histoFileList[j], dataStore.histoFileList[j]) );
}

// Fire the onchange event for the select with the default value to set it
//document.getElementById('HistoListSelect'+thisTitle).onchange();
}
}

}
*/

//////////////////////////////////
// App workflow generic functions
//////////////////////////////////
// These functions serve as the workflow for various apps.
// Each function performs a task and puts results into standard places.
// Each fucntion ends in a callback which should be custom in the specific app scripts/appName.js file.
// The next workflow function is called from the callback function of the previous task.


function receiveScript(payload){

  // Copy the payload into the local json object
  // Should do fornat error checking here
  document.getElementById('error-messages-for-drop-area').innerHTML = "";
  try{
    dataStore.peakFitterScript = JSON.parse(payload);
  }
  catch(err){
    document.getElementById('error-messages-for-drop-area').innerHTML = "Format error in json script!\n" + err;
  }

  // Actual lists of arrays and objects used in workflow
  // Lists for the histogram filenames, 1d spectrum names, peak centroids to fit in 1d spectra, 2d spectrum names, gate limits for making projections, peak centroids to fit in 2d spectra.
  dataStore.spectrumListHistoFileNames = dataStore.peakFitterScript.histogramFileNames;  // List of all the histogram files
  dataStore.spectrumListHistoFileNames = [...new Set(dataStore.spectrumListHistoFileNames)]; // Remove duplicates
  dataStore.spectrumList1d = dataStore.peakFitterScript.spectrumList1d;
  dataStore.spectrumList1dPeaks = dataStore.peakFitterScript.spectrumList1dPeaks;   // List of all peaks to fit in the 1d spectra
  dataStore.spectrumList2d = dataStore.peakFitterScript.spectrumList2d;
  for(var i=0; i<dataStore.peakFitterScript.spectrumList2d.length; i++){
    dataStore.spectrumListGates[dataStore.peakFitterScript.spectrumList2d[i]] = [];

    for(var j=0; j<dataStore.peakFitterScript.spectrumListGates.length; j++){
      dataStore.spectrumListGates[dataStore.peakFitterScript.spectrumList2d[i]].push( dataStore.peakFitterScript.spectrumListGates[j]);
    }
  }
  dataStore.spectrumListProjections = []; // Will be populated later
  dataStore.spectrumListProjectionsPeaks = dataStore.peakFitterScript.spectrumListProjectionsPeaks;                      // List of all peaks to fit in the projected 1d spectra from 2d spectra

  // In the Peaks object:
  // A key of "All" will add that list of peaks to all spectrum names for all histogram files.
  // A key of "spectrumName" will add that list of peaks to all spectra with the given name for all histogram files.
  // A key of "histogramName" will add that list of peaks to all spectra for the given histogram filename.
  // A key of "histogramName:spectrumName" will add the list of peaks to a single spectrum of a single histogram name.
  // Check the peaks object for the keyword "All". If this is present, create an entry for all spectra with this set of peaks
  if(dataStore.spectrumList1dPeaks.hasOwnProperty("All") || dataStore.spectrumList1dPeaks.hasOwnProperty("all")){
    // Start with an All list in ascending order
    dataStore.spectrumList1dPeaks["All"].sort(function(a, b){return a-b});

    // Look through the list of histogram names
    for(var fileNameIndex=0; fileNameIndex<dataStore.spectrumListHistoFileNames.length; fileNameIndex++){
      // Loop through the list of all 1d spectra
      for(var i=0; i<dataStore.spectrumList1d.length; i++){
        var spectrumKey = dataStore.spectrumListHistoFileNames[fileNameIndex].split(".")[0] + ":" + dataStore.spectrumList1d[i];
        if(!dataStore.spectrumList1dPeaks.hasOwnProperty(spectrumKey)){
          // A key for this spectrum name does not exist. Create it now and populate the array with the All peaks.
          dataStore.spectrumList1dPeaks[spectrumKey] = [];
        }

        // Add the peaks specified for this spectrum name in all files, if that exists.
        if(dataStore.spectrumList1dPeaks.hasOwnProperty(dataStore.spectrumList1d[i])){
          dataStore.spectrumList1dPeaks[spectrumKey].push(...dataStore.spectrumList1dPeaks[dataStore.spectrumList1d[i]]);
        }

        // Also add the peaks specified for this histogram file name, if that exists.
        if(dataStore.spectrumList1dPeaks.hasOwnProperty(spectrumKey.split(":")[0])){
          dataStore.spectrumList1dPeaks[spectrumKey].push(...dataStore.spectrumList1dPeaks[spectrumKey.split(":")[0]]);
        }

        // A key already exists for this spectrum name, so add the All peaks to this array containing unique peaks
        dataStore.spectrumList1dPeaks[spectrumKey].push(...dataStore.spectrumList1dPeaks["All"]);

        // Remove any duplicate values. This seems to be easier than checking before pushing the other lists.
        dataStore.spectrumList1dPeaks[spectrumKey] = [...new Set(dataStore.spectrumList1dPeaks[spectrumKey])];

        // Sort the Array now we have added more peaks
        dataStore.spectrumList1dPeaks[spectrumKey].sort(function(a, b){return a-b});
      }
    }
  }

  // The projectionsPeaks object will be filled after the projections are made. Here just sort the list.
  if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty("All") || dataStore.spectrumListProjectionsPeaks.hasOwnProperty("all")){
    // Start with an All list in ascending order
    dataStore.spectrumListProjectionsPeaks["All"].sort(function(a, b){return a-b});
  }

  // Now populate the user input boxes from this json script
  document.getElementById('inputHistogramFiles').value = dataStore.peakFitterScript.histogramFileNames;
  document.getElementById('input1dSpectrumNames').value = dataStore.peakFitterScript.spectrumList1d;
  document.getElementById('input1dPeaks').value = dataStore.peakFitterScript.spectrumList1dPeaks["All"];
  document.getElementById('input2dSpectrumNames').value = dataStore.peakFitterScript.spectrumList2d;
  document.getElementById('input2dPeaks').value = dataStore.peakFitterScript.spectrumListProjectionsPeaks["All"];
  var gatesString = "";
  var keys = Object.keys(dataStore.spectrumListGates);
  if(keys.length>0){
    for(var i=0; i<dataStore.spectrumListGates[keys[0]].length; i++){
      if(i==0) gatesString += "[";
      if(i>0)  gatesString += "],[";
      gatesString += dataStore.spectrumListGates[keys[0]][i];
    }
    gatesString += "]";
    document.getElementById('input2dGates').value = gatesString;
  }

}

function receiveInputTextBoxChange(boxName,textString){
  var payload = {};
  payload = dataStore.peakFitterScript;

  var input2key = {
    "inputHistogramFiles" : "histogramFileNames",
    "input1dSpectrumNames" : "spectrumList1d",
    "input1dPeaks" : "spectrumList1dPeaks",
    "input2dSpectrumNames" : "spectrumList2d",
    "input2dGates" : "spectrumList2dGates",
    "input2dPeaks" : "spectrumListProjectionsPeaks"
  };

  var key = input2key[boxName];

  // Modify the specific section based on this text box
  switch(boxName){
    case "inputHistogramFiles" :
    case "input1dSpectrumNames" :
    case "input2dSpectrumNames" :
    //var formattedString = "[" + textString + "]";
    var valuesArray = textString.split(",");
    // Insert Quotes
    payload[key] = valuesArray;
    break;
    case "input1dPeaks" :
    case "input2dPeaks" :
    var valuesArray = textString.split(",").map(Number);
    payload[key] = {"All":valuesArray};
    break;
    case "input2dGates" :
    var arraysArray = [];
    var stringsArray = textString.split("],[");
    stringsArray[0] = stringsArray[0].substring(1);
    stringsArray[stringsArray.length-1] = stringsArray[stringsArray.length-1].slice(0, -1);
    stringsArray.forEach((item, i) => {
      var itemArray = item.split(",");
      arraysArray[i] = [];
      arraysArray[i][0] = itemArray[0];
      for(var j=1; j<itemArray.length; j++){
        arraysArray[i][j] = Number(itemArray[j]);
      }
    });

    payload[key] = arraysArray;
    break;
    default: break;
  }

  receiveScript(JSON.stringify(payload));
}

// Function to save the run details from the Config file received from the server
function processConfigFileForRunDetails(payload){
  // The run duration is required for calculating the absolute efficiency.
  // The run start date and time is required for calculating the source activity at the time of the data collection.
  // Unpack the response from the server into a local variable

  if(payload.length<2){
    console.log("Problem getting Config information for file: "+dataStore.histoFileName+". Check filename and data directory.");
    document.getElementById('error-messages-for-drop-area').innerHTML = "Problem getting Config information for file: "+dataStore.histoFileName+". Check filename and data directory.";
  }else{
    //  console.log(payload);
  }
  var thisConfig = JSON.parse(payload);

  // Ensure the object exists
  if(!dataStore.spectrumListHistoFileDetails){
    dataStore.spectrumListHistoFileDetails = {};
  }

  // Unpack Midas content
  var keyName = dataStore.histoFileName.split(".")[0];
  dataStore.spectrumListHistoFileDetails[keyName] = {
    'Title': thisConfig.Analyzer[6].Midas[0].Value,
    'StartTime': thisConfig.Analyzer[6].Midas[1].Value,
    'Duration': thisConfig.Analyzer[6].Midas[2].Value,
  };

  // Save the Calbration data as well
  dataStore.Config = thisConfig.Analyzer[4].Calibrations;
}

// Function to increment the progressBar by the stated amount
function updateProgressBar(updateValue){
  dataStore.progressBarTasksCompleted+=parseInt(updateValue);
  dataStore.ProgressValue = (100*(dataStore.progressBarTasksCompleted/dataStore.progressBarNumberTasks)).toFixed(1);
  document.getElementById(dataStore.progressBarKey).setAttribute('style', "width:" + dataStore.ProgressValue + "%" );
  document.getElementById(dataStore.progressBarKey).innerHTML = dataStore.ProgressValue + "% complete";
}

function setupProgressBarTracking(){
  // Set up the progress tracking
  // Assumes the peakFitterScript has already been setup up

  // Save the length of the lists which are Objects for easy use later
  dataStore.numRunFiles = dataStore.spectrumListHistoFileNames.length;
  dataStore.num1dSpectra = dataStore.spectrumList1d.length;
  var keys = Object.keys(dataStore.spectrumList1dPeaks);
  for(var i=0; i<keys.length; i++){
    dataStore.num1dPeaks += dataStore.spectrumList1dPeaks[keys[i]].length;
  }
  dataStore.num2dSpectra = dataStore.spectrumList2d.length;
  var keys = Object.keys(dataStore.spectrumListGates);
  if(keys.length>0){
    dataStore.num2dGates = dataStore.spectrumListGates[keys[0]].length;
  }else{ dataStore.num2dGates = 0; }
  var keys = Object.keys(dataStore.spectrumListProjectionsPeaks);
  for(var i=0; i<keys.length; i++){
    dataStore.num2dPeaks += dataStore.spectrumListProjectionsPeaks[keys[i]].length;
  }

  // Set up the progress bar and task list
  dataStore.progressBarNumberTasks = 0;

  // Count the number of histograms to fetch
  //dataStore.progressBarNumberTasks += (dataStore.num1dSpectra * dataStore.numRunFiles);
  //dataStore.progressBarNumberTasks += (dataStore.num2dSpectra * dataStore.numRunFiles);

  // Count the number of peaks for each 1d spectrum
  if(dataStore.num1dSpectra>0){
    dataStore.progressBarNumberTasks += (dataStore.numRunFiles * dataStore.num1dSpectra * dataStore.spectrumList1dPeaks["All"].length);
  }

  // Count the number of projections to make and peaks to fit in projections of each 2d spectrum
  if(dataStore.num2dSpectra>0){
    // Num of matrices to download and unpack locally...
    dataStore.progressBarNumberTasks += (dataStore.numRunFiles * dataStore.num2dSpectra);
    // Num of projections to make...
    dataStore.progressBarNumberTasks += (dataStore.numRunFiles * dataStore.num2dSpectra * dataStore.num2dGates);
    // Total number of peaks to fit in all projections, from the "All" entry
    dataStore.progressBarNumberTasks += (dataStore.numRunFiles * dataStore.num2dSpectra * dataStore.num2dGates * dataStore.spectrumListProjectionsPeaks["All"].length);
    // Count the number of other peaks to be fitted
    for(var i=0; i<keys.length; i++){
      if(keys[i] != "All"){
        if(keys[i].includes(":") && (keys[i].includes("x-") || keys[i].includes("y-"))){
          // These peaks are specific to one projection
          dataStore.progressBarNumberTasks += dataStore.spectrumListProjectionsPeaks[keys[i]].length;
        }else if(keys[i].includes("run")){
          // These peaks are specific to one histogram file
          dataStore.progressBarNumberTasks += (dataStore.num2dSpectra * dataStore.num2dGates * dataStore.spectrumListProjectionsPeaks[keys[i]].length);
        }else if(keys[i].includes("x-") || keys[i].includes("y-")){
          // These peaks are specific to one projection of one spectrum for all histogram file
          dataStore.progressBarNumberTasks += (dataStore.numRunFiles * dataStore.spectrumListProjectionsPeaks[keys[i]].length);
        }else{
          // These peaks are specific to all projections for one spectrum in all histogram files
          dataStore.progressBarNumberTasks += dataStore.numRunFiles * dataStore.num2dGates * dataStore.spectrumListProjectionsPeaks[keys[i]].length;
        }
      }
    }
  }

  console.log("Number of tasks: run files = "+dataStore.numRunFiles);
  console.log("Number of tasks: 1d peaks = "+dataStore.num1dPeaks);
  console.log("Number of tasks: 2d spectra = "+dataStore.num2dSpectra);
  console.log("Number of tasks: 2d gates = "+dataStore.num2dGates);
  console.log("Number of tasks: 2d peaks = "+dataStore.num2dPeaks);

  console.log("Number of tasks = "+dataStore.progressBarNumberTasks);

}

// createAllLocalMatrices(listOfMatrices,progressBarKey,callback);
// This function calls the function createLocalMatrices(spectrumName) and they are required together.
// This function should be called after 2d matrices are fetched from the server.
// Loops through the liftOfMatrices and unpacks the received content correctly.
// Fetched 2d spectra are initially placed in dataStore.rawData object.
// The function packZcompressed() is used to uncompress each 2d spectrum.
// The uncompressed 2d spectrum object is placed in dataStore.matrix array,
// and the dataStore.rawData version deleted to reduce total memory usage.
// Input: listOfMatrices is an array. A list of 2d spectrum names.
//        The "histoFileName:" must be added to the beginning of the name in this function for it to be used as a key for rawData.
// Input: callback is a function to be called one the work of this function is completed.
// Note: The progress bar will be incremented. The dataStore.progressBarKey variable must be set with the id of the div with class="progress-bar ..." and will be updated during execution of this function.
// Note: dataStore.histoFileName must be set correctly.
// Note: dataStore.matrix array must be declared.
async function createAllLocalMatrices(listOfMatrices,callback){

  // Create the objects for each matrix in the local storage
  for(let i=0; i<listOfMatrices.length; i++){

    // Update the progress bar by one task
    updateProgressBar(1);

    // Process the next matrix before updating the progress bar again
    await createLocalMatrices(listOfMatrices[i]);

  } // End of for loop

  // Call the callback function
  callback();
}


// Works in partnership with createAllLocalMatrices(listOfMatrices,callback);
// See notes for that function.
async function createLocalMatrices(spectrumName){

  // Return a new promise.
  return new Promise(function(resolve) {

    // Create the new object for this matrix in the local storage
    var thisKey = dataStore.histoFileName.split(".")[0] + ":" + spectrumName;

    // Check this matrix has been received from the server
    try{
      var name = dataStore.rawData[thisKey].name;
    }
    catch(err){
      document.getElementById('error-messages-for-drop-area').innerHTML = "Problem fetching matrix "+thisKey+". Check spectrum name.";
      return;
    }

    var thisMatrix = {
      "name" : dataStore.rawData[thisKey].name,
      "xlength" : dataStore.rawData[thisKey].XaxisLength,
      "ylength" : dataStore.rawData[thisKey].YaxisLength,
      "xmin" : dataStore.rawData[thisKey].XaxisMin,
      "ymin" : dataStore.rawData[thisKey].YaxisMin,
      "xmax" : dataStore.rawData[thisKey].XaxisMax,
      "ymax" : dataStore.rawData[thisKey].YaxisMax,
      "zmin" : dataStore.rawData[thisKey].ZaxisMin,
      "zmax" : dataStore.rawData[thisKey].ZaxisMax,
      "zminfull" : dataStore.rawData[thisKey].ZaxisMin,
      "zmaxfull" : dataStore.rawData[thisKey].ZaxisMax,
      "data" : []
    };
    dataStore.matrix[thisKey] = thisMatrix;

    // Unpack the raw data to the local storage
    // The last argument as false, suppresses the generation of a colorMap used for displaying as a heatmap
    // Unpack the compressed matrix data received from the server
    var thisMatrixData = packZcompressed(dataStore.rawData[thisKey].data2, dataStore.rawData[thisKey].XaxisLength, dataStore.rawData[thisKey].YaxisLength, dataStore.rawData[thisKey].ZaxisMax,dataStore.rawData[thisKey].symmetrized, false);

    // Trim the matrix and save it in the object
    //  dataStore.matrix[thisKey].data = trimMatrix(thisMatrixData,3);
    dataStore.matrix[thisKey].data = thisMatrixData;

    // Delete the raw version to reduce total memory usage
    delete dataStore.rawData[thisKey];

    // resolve the promise
    // This 5ms pause is necessary so that the DOM update of the progressBar actually happens during the looping.
    setTimeout(function(){resolve('Success!')},5);
  });

}

// projectAllMatrices(projectionsList)
// This function calls the function createNewProjection() and they are required together.
// This function should be called after 2d matrices have been uncompressed to local storage.
// Loops through the projectionsList to make all requested projections from each 2d spectrum.
// Input: projectionsList is an array of objects.
// Each object contains the "matrixName" which is a valid key for the dataStore.matrix array.
// Each object also contains the "gateDetails" which is an array of gates specific to that 2d spectrum.
// Format for gates: 'matrixname': [[axis,gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max], [], ...]
// Where BG1SF is the Scaling Factor for a projection between bins BG1Min and BG1Max which will be subtracted from the main Gate projection between bins gateMin and gateMax onto the 'axis' axis.
// The axis,gateMin,gateMax members are required. All others are optional.
// Input: compressed is a true/false selector.
// If compressed=false the function uses the dataStore.matrix array
// If compressed=true the function uses the promiseUnpackedBinaryMatrixData function to unpack the data
// Input: menuGroupID is the ID of the location to add these projections to the spectrum menu (used as 'plotListplots'+menuGroupID)
// Note: Terminates with projectionsCallback().
function projectAllMatrices(projectionsList,compressed,menuGroupID){
  //make the projections for the matrix of each source based on the peaks defined.

  // Get the list of keys for the matrices to be projected
  matrixKeys = projectionsList;

  dataStore.activeMatrix = ""; // reset the active matrix before the first projection

  releaser(
    async function(i){

      // Update the progress bar by one task
      updateProgressBar(1);

      // Change rawData to another list that is just the Sum_Energy_ spectrum
      var matrixKeys = projectionsList;

      // Set the details for this matrix needed by the projectXaxis function
      var thisKey = matrixKeys[i].matrixName;

      // Only uncompress or copy the data in if the activeMatrix has changed since the previous projection
      if(dataStore.activeMatrix != thisKey){
        dataStore.activeMatrix = thisKey;

        if(compressed){
          // Uncompress the matrix data for this histogram
          await promiseUnpackedBinaryMatrixData(thisKey);
        }else{
          dataStore.hm._raw = dataStore.matrix[thisKey].data;
        }
      }

      // Set limits for the projections in this matrix
      var gateMin = matrixKeys[i].gateDetails[1];
      var gateMax = matrixKeys[i].gateDetails[2];

      // Set limits for the backgrounds to be subtracted from the projections
      var BG1SF  = matrixKeys[i].gateDetails[3];
      var BG1Min = matrixKeys[i].gateDetails[4];
      var BG1Max = matrixKeys[i].gateDetails[5];
      var BG2SF  = matrixKeys[i].gateDetails[6];
      var BG2Min = matrixKeys[i].gateDetails[7];
      var BG2Max = matrixKeys[i].gateDetails[8];

      // Now make the projection around the gate energy
      // and the associated background projections
      if(matrixKeys[i].gateDetails[0] == "x"){
        await createNewProjection("x",gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max);
      }else if(matrixKeys[i].gateDetails[0] == "y"){
        await createNewProjection("y",gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max);
      }else{
        console.log("Problem with defined axis for "+matrixKeys[i]);
      }

    }.bind(this),

    function(){
      // This code is executed only after the full list of matrixKeys has been processed by the previous function.

      // Need to move these projections into the dataStore.spectrumListProjections object
      // Need to add these projections to the spectrum menu
      var keys = Object.keys(dataStore.createdSpectra);
      keys.sort();
      var histoName = dataStore.histoFileName.split(".")[0];

      for(i=0; i<keys.length; i++){
        // Only process the newly created projections for the current histogram file
        if(!keys[i].includes(histoName)){ continue; }

        // Add this projection spectrum to the list which need to be fitted
        dataStore.spectrumListProjections.push(keys[i]);

        // Create the list of peaks to fit for this projection if it does not already exist.
        // If it exists it is because it has unique peaks specified for it.
        if(!dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i])){
          // A key for this spectrum name does not exist.
          dataStore.spectrumListProjectionsPeaks[keys[i]] = [];
        }

        // Add the list of peaks for this filename, if it exists
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i].split(":")[0])){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[keys[i].split(":")[0]]);
        }

        // Add the list of peaks for this 2d spectrum name, if it exists
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i].split(":")[1].split("x-")[0])){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[keys[i].split(":")[1].split("x-")[0]]);
        }
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i].split(":")[1].split("y-")[0])){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[keys[i].split(":")[1].split("y-")[0]]);
        }

        // Add the list of peaks for this projection for all 2d spectra for all filenames, if it exists
        // Projection list keys will start with either 'x' or 'y'
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(("x-"+(keys[i].split(":")[1].split("x-")[1])))){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[("x-"+(keys[i].split(":")[1].split("x-")[1]))]);
        }
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(("y-"+(keys[i].split(":")[1].split("y-")[1])))){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[("y-"+(keys[i].split(":")[1].split("y-")[1]))]);
        }

        // Add the list of peaks for this specific projection name, if it exists
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i].split(":")[1])){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[keys[i].split(":")[1]]);
        }

        // Add the All peaks for projections
        dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks["All"]);

        // Remove any duplicate values. This seems to be easier than checking before pushing the other lists.
        dataStore.spectrumListProjectionsPeaks[keys[i]] = [...new Set(dataStore.spectrumListProjectionsPeaks[keys[i]])];

        // Sort the Array now we have added all peaks
        dataStore.spectrumListProjectionsPeaks[keys[i]].sort(function(a, b){return a-b});

        // Add this projection to the spectrum menu
        newMenuItem = document.createElement('li');
        newMenuItem.setAttribute('id', 'plotList'+keys[i]);
        newMenuItem.setAttribute('value', keys[i]);
        newMenuItem.setAttribute('class', 'list-group-item toggle');
        newMenuItem.innerHTML = keys[i].split(':')[1].trim()+'<span id=\'plotListbadge'+keys[i]+'\' class=\"badge plotPresence hidden\">&#x2713;</span>';
        document.getElementById('plotListplots'+menuGroupID).appendChild(newMenuItem);
        document.getElementById('plotList'+keys[i]).onclick = function(){ dataStore._plotListLite.exclusivePlot(this.id.split('plotList')[1], dataStore.viewers[dataStore.plots[0]]); }
      }

      // Callback
      projectionsCallback();

    }.bind(this),

    matrixKeys.length-1
  )
};

// Works in partnership with projectAllMatrices(projectionsList);
// See notes for that function.
// Format for inputs: axis,gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max
// The axis,gateMin,gateMax members are required. All others are optional and should be undefined if not requested.
// Where BG1SF is the Scaling Factor for a projection between bins BG1Min and BG1Max which will be subtracted from the main Gate projection between bins gateMin and gateMax onto the 'axis' axis.
async function createNewProjection(axis,min,max,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max){
  //create the projections for the gate energy and the BG1 and BG2 regions
  var i, evt, plotName;

  // Return a new promise.
  return new Promise(function(resolve) {

    // Make the gated spectrum
    if(axis === 'y'){
      plotName = projectYaxis(min,max,'gate');
    }else{
      plotName = projectXaxis(min,max,'gate');
    }

    // Make the BG spectra if requested
    if(typeof(BG1Min) != 'undefined'){
      if(axis === 'y'){
        plotNameBG1 = projectYaxis(BG1Min,BG1Max,'BG1',plotName);
        plotNameBG2 = projectYaxis(BG2Min,BG2Max,'BG2',plotName);
      }else{
        plotNameBG1 = projectXaxis(BG1Min,BG1Max,'BG1',plotName);
        plotNameBG2 = projectXaxis(BG2Min,BG2Max,'BG2',plotName);
      }
    }

    // Save a local copy of the gated spectrum in order to perform background subtraction
    var subtractedHistogram = dataStore.createdSpectra[plotName];

    // Subtract the first background spectrum
    if(typeof(BG1Min) != 'undefined'){
      for(var j=0; j<dataStore.createdBG1Spectra[plotName].length; j++){
        subtractedHistogram[i] -= Math.floor(dataStore.createdBG1Spectra[plotName][j]*BG1SF);
      }
    }

    // Subtract the second background spectrum
    if(typeof(BG2Min) != 'undefined'){
      for(j=0; j<dataStore.createdBG2Spectra[plotName].length; j++){
        subtractedHistogram[i] -= Math.floor(dataStore.createdBG2Spectra[plotName][j]*BG2SF);
      }
    }

    // Add this background-subtracted projection to the rawData storage for plotting
    dataStore.rawData[plotName] = subtractedHistogram;

    // Remove these items from the BG1 and BG2 objects so they are not subtracted in gammaSpectrum
    delete dataStore.createdBG1Spectra[plotName];
    delete dataStore.createdBG2Spectra[plotName];

    // resolve the promise
    setTimeout(function(){resolve('Success!')},5);
  });

};


function roughGainMatch(spectrumList,detType,sourceType){
  console.log("roughGainMatch for "+detType+" with "+sourceType);

  var gainRange = {
    "HPGe": {"min": 1.0, "max": 1.5, "step":0.001}, // minimum and maximum gains to sweep over
    "LaBr3": {"min": 0.7, "max": 2.2, "step":0.001}, // minimum and maximum gains to sweep over
    "PACES": {"min": 0.7, "max": 0.9, "step":0.001}, // minimum and maximum gains to sweep over
    "RCMP": {"min": 1.1, "max": 1.5, "step":0.001}, // minimum and maximum gains to sweep over
    "ARIES": {"min": 0.2, "max": 0.4, "step":0.001}, // minimum and maximum gains to sweep over
    "DES_Wall": {"min": 0.7, "max": 1.2, "step":0.001}, // minimum and maximum gains to sweep over
  };

  for(var i=0; i<spectrumList.length; i++){

    // Update the progress bar by one task
    updateProgressBar(1);

    // Create the empty spectrum that will be a starting point for each interation

    // Get the reference spectrum from the store
    var testSpectrumLength = dataStore.referenceSpectrum[detType][sourceType].length;
    var referenceSpectrum = dataStore.referenceSpectrum[detType][sourceType].slice(0,testSpectrumLength);

    // Set the parameters for the chi-square sweep
    var gainLowerLimit = gainRange[detType].min;
    var gainUpperLimit = gainRange[detType].max;
    var gainStepSize = gainRange[detType].step;
    var minChiSquare = 100000000;
    var chiSquareSeries = [];
    var optimalGain = 1.0; // set here in case we dont get a minimum
    // Scan through gain values
    for(gain=gainLowerLimit; gain<gainUpperLimit; gain+=gainStepSize){
      // Zero the spectra at each iteration
      testSpectrum = []; testSpectrum.fillN(0,testSpectrumLength); // Try and match between zero and 2MeV
      errorSpectrum = []; errorSpectrum.fillN(0,testSpectrumLength); // Try and match between zero and 2MeV

      // Fill the testSpectrum by applying this gain value
      // NOTE THIS APPROACH ONLY WORKS FOR GAIN VALUES > 1.0
      for(j=0; j<testSpectrumLength; j++){
        var bin = Math.round(j*gain);
        if(bin>=0 && bin<testSpectrumLength){
          testSpectrum[bin] += dataStore.rawData[spectrumList[i]][j];
        }
      }
      // Calculate the errorSpectrum from the testSpectrum
      for(j=0; j<testSpectrumLength; j++){ errorSpectrum[j] = Math.sqrt(testSpectrum[j]); }
      testSpectrum[0] = 0; errorSpectrum[0] = 0; // elimimate noise
      if(detType == "HPGe"){
        for(j=0; j<75; j++){  // Zero the first 75 channels because they cause problems for high-threshold channels
          testSpectrum[j] = 0; errorSpectrum[j] = 0; referenceSpectrum[j] = 0;
        }
      }

      // Calculate the chi square value between this testSpectrum and the referenceSpectrum
      thisChiSquare = calculateChiSquare(testSpectrum,errorSpectrum,referenceSpectrum);
      chiSquareSeries.push(thisChiSquare);

      // Decide if this is the best fit and save it if it is
      if(thisChiSquare<minChiSquare){ minChiSquare = thisChiSquare; optimalGain = gain; }
    }

    // Save the optimal gain value in the standard place for use later
    dataStore.roughGainMatchParameters[spectrumList[i]] = optimalGain;
    console.log("Optimal gain for "+spectrumList[i]+": best chi-square ("+minChiSquare +") at gain "+optimalGain);

    // Save the roughly gain-matched spectrum to the createdSpectra object ready for peakfitting
    var thisRoughGainMatchedName = spectrumList[i].replace("_Pulse_Height","_Energy");
    testSpectrum = []; testSpectrum.fillN(0,dataStore.rawData[spectrumList[i]].length);
    for(j=0; j<testSpectrumLength; j++){
      var bin = parseInt(j*optimalGain);
      if(bin>=0 && bin<testSpectrumLength){
        testSpectrum[bin] += dataStore.rawData[spectrumList[i]][j];
        //  testSpectrum[bin+1] += parseInt(dataStore.rawData[spectrumList[i]][j]/2);
      }
    }
    dataStore.createdSpectra[thisRoughGainMatchedName] = testSpectrum; // Used in building menu
    dataStore.rawData[thisRoughGainMatchedName] = testSpectrum; // necessary for exclusivePlot

    //  console.log(chiSquareSeries);
  }

  // Callback
  roughGainMatchCallback();
}

function fitPeaksInSeriesOfHistograms(spectra,peaks,detectorType){
  //fit all spectra to the peaks defined.

  // Return a new promise.
  return new Promise(function(resolve, reject) {

    // Get the list of keys
    var i, keys = spectra,
    buffer = dataStore.currentPlot //keep track of whatever was originally plotted so we can return to it

    //dump data so there is one displayed at a time
    dataStore.viewers[dataStore.plots[0]].removeData(dataStore.currentPlot);

    //set up fit callbacks
    dataStore.viewers[dataStore.plots[0]].fitCallback = fitCallback;

    releaser(
      function(i){
        // Set up the next spectra and peaks to fit
        var keys = spectra;
        var thisKey = keys[i];

        // Peak values must be integer as they represent bin/channel numbers
        var thesePeaks = [];
        for(var j=0; j<peaks[keys[i]].length; j++){
          thesePeaks.push(parseInt(peaks[keys[i]][j]));
        }

        // Update the progress bar by one task
        updateProgressBar(thesePeaks.length);

        // Call the fitting routine
        fitSpectra(thisKey,thesePeaks,detectorType)
      }.bind(this),

      function(){
        var evt;
        //set up fit line re-drawing
        dataStore.viewers[dataStore.plots[0]].drawCallback = addFitLines;

        // Callback
        fittingCallback();

      }.bind(this),

      keys.length-1
    )

  }); // end of promise definition

}


function fitSpectra(spectrum,peaks,detectorType){
  //redo the fits for the named spectrum.
  //<spectrum>: string; name of spectrum, per names from analyzer

  var peakIndex = 0;
  var viewerName = dataStore.plots[0];

  //set up fitting for this spectrum/source
  dataStore.currentPlot = spectrum;
  dataStore.viewers[viewerName].plotData() //kludge to update limits, could be nicer
  dataStore.viewers[viewerName].fitTarget = spectrum;
  dataStore._plotListLite.exclusivePlot(spectrum, dataStore.viewers[dataStore.plots[0]]);

  //locate the spectrum in the dataStore
  if(spectrum in dataStore.createdSpectra){ // true if spectrum is a key of createdSpectra
    //set up the spectrum data for fitting
    dataStore.viewers[viewerName].addData(spectrum, JSON.parse(JSON.stringify(dataStore.createdSpectra[spectrum])) );
  }else if(spectrum in dataStore.rawData){
    //set up the spectrum data for fitting
    dataStore.viewers[viewerName].addData(spectrum, JSON.parse(JSON.stringify(dataStore.rawData[spectrum])) );
  }else{
    console.log("Failed to locate spectrum data for \'"+spectrum+"\' in fitSpectra");
    return;
  }

  // Loop through the peaks to fit for this projection
  for(peakIndex=0; peakIndex<peaks.length; peakIndex++){

    // Determine the peak width for the fit region
    var thisPeakWidth = Math.ceil(typicalPeakWidth(peaks[peakIndex],detectorType)*3);

    //set up peak fit
    dataStore.currentPeak = peakIndex;
    if(!dataStore.ROI[dataStore.currentPlot]){ dataStore.ROI[dataStore.currentPlot] =[]; }
    if(!dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak]){ dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak] = []; }
    dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][0] = parseInt(peaks[peakIndex] - thisPeakWidth);
    dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][1] = parseInt(peaks[peakIndex] + thisPeakWidth);
    dataStore.viewers[viewerName].FitLimitLower = peaks[peakIndex] - thisPeakWidth;
    dataStore.viewers[viewerName].FitLimitUpper = peaks[peakIndex] + thisPeakWidth;
    dataStore.viewers[viewerName].fitData(spectrum, 0);
  }

  //dump data so it doesn't stack up
  dataStore.viewers[viewerName].removeData(spectrum);
}


function fitCallback(center, width, amplitude, intercept, slope){
  //after fitting, log the fit results, as well as any modification made to the ROI by the fitting algortihm
  //also update table
  //<center>: number; center of gaussian peak
  //<width>: number; width of peak
  //<amplitude>: number; amplitude of peak
  //<intercept>: number; intercept of linear background beneath peak
  //<slope>: number; slope of linear background

  var refitPeak = document.getElementById('refitPeakButton');
  var viewerName = dataStore.plots[0];

  // Calculate peak area here
  var integral = 0,
  functionVals = [],
  i, x, sigmas = 5, stepSize = 0.01;
  //calculate peak area in excess of background, for <sigmas> up and down.
  for(i=0; i<2*sigmas*width/stepSize; i++){
    x = center - sigmas*width + i*stepSize;
    functionVals.push( gauss(amplitude, center, width, x)*stepSize );
    integral = functionVals.integrate();
  }
  var area = parseInt(integral.toFixed(0));

  // Calculate the variance of the peak area
  // Equal to the sum of the variance in the Gross peak area and background areas
  functionVals = [];
  for(i=0; i<2*sigmas*width/stepSize; i++){
    x = center - sigmas*width + i*stepSize;
    functionVals.push( ((slope*x)+intercept)*stepSize );
    integral = functionVals.integrate();
  }
  var bkgArea = parseInt(integral.toFixed(0));
  var grossArea = area + bkgArea;
  var bkgAreaVariance = Math.sqrt(bkgArea);
  var grossAreaVariance = Math.sqrt(grossArea);
  var areaVariance = grossAreaVariance+bkgAreaVariance;
  if(isNaN(areaVariance)){ areaVariance=1; } // used as a denominator
  console.log("fitCallback "+[center, width, amplitude, intercept, slope]);
  console.log("Bkg Area   = "+bkgArea+"("+bkgAreaVariance+")");
  console.log("Gross Area = "+grossArea+"("+grossAreaVariance+")");
  console.log("Net Area   = "+area+"("+areaVariance+"), raw sqrt = "+Math.sqrt(area));


  // Calculate the Full Width at Half Maximum (FWHM) here
  var fwhm = (width*2.35);

  //keep track of fit results and peak area
  if(!dataStore.fitResults[dataStore.currentPlot]) dataStore.fitResults[dataStore.currentPlot] = [];
  dataStore.fitResults[dataStore.currentPlot][dataStore.currentPeak] = [amplitude, center, width, intercept, slope, area, fwhm];

  // Update the ROI in case they were modified by the fitting routine
  // DO WE NEED ROI ANY MORE? Yes, for addFitLines
  dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][0] = dataStore.viewers[viewerName].FitLimitLower;
  dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][1] = dataStore.viewers[viewerName].FitLimitUpper;

  // Check for failed fit. The center of the Gaussian must be within the search region
  if(center < dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][0] || center > dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][1]){
    dataStore.fitResults[dataStore.currentPlot][dataStore.currentPeak] = [NaN,NaN,NaN,NaN,NaN,NaN,NaN];
  }

/*
  // Calculate uncertainty in this fit (used in angularCorrelations)
  // Calculate the chi-square of the fitline and data
  // Multiply the sqrt(area) with sqrt(chi^2/nu)
  var index=0, nu, dataSeries = [], uncertaintySeries = [], fitSeries = [];
  //  for(i=dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][0]; i<dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][1]; i++){
  for(i=Math.floor(center-(3*width)); i<Math.ceil(center+(3*width)); i++){
    dataSeries[index] = dataStore.rawData[dataStore.currentPlot][i];
    fitSeries[index] = intercept + slope*i + amplitude*Math.exp(-1*(((i-center)*(i-center))/(2*width*width)));
    index++;
  }
  nu = (index+1) - 5; // 5 parameters in the peak fit; centroid, width, height, BG slope, BG offset
  uncertaintySeries = dataSeries.map((x) => (Math.sqrt(x)*10) );
  */

  // Fit uncertainty is the sum of the variance in the Gross peak area and background areas. Those variance are both sqrt(number of counts)
  if(typeof dataStore.fitUncertainty === 'undefined'){ dataStore.fitUncertainty = []; }
  if(typeof dataStore.fitUncertainty[dataStore.currentPlot] === 'undefined'){ dataStore.fitUncertainty[dataStore.currentPlot] = []; }
  if(typeof dataStore.fitUncertainty[dataStore.currentPlot][dataStore.currentPeak] === 'undefined'){ dataStore.fitUncertainty[dataStore.currentPlot][dataStore.currentPeak] = []; }
  dataStore.fitUncertainty[dataStore.currentPlot][dataStore.currentPeak] = areaVariance;
    // Fit uncertainty is the reduced Chi square of the fit, multiplied by the sqrt of the number of counts (area)
//  dataStore.fitUncertainty[dataStore.currentPlot][dataStore.currentPeak] = Math.sqrt(calculateChiSquare(dataSeries,uncertaintySeries,fitSeries)/nu)*Math.sqrt(area);
//  console.log(dataStore.currentPlot + ", peak " + dataStore.currentPeak);
//  console.log("fitUncertainty of "+dataStore.fitUncertainty[dataStore.currentPlot][dataStore.currentPeak]/area+" from "+dataStore.fitUncertainty[dataStore.currentPlot][dataStore.currentPeak]+" from chi-square of "+calculateChiSquare(dataSeries,uncertaintySeries,fitSeries)+" and reduced chi-square of "+calculateChiSquare(dataSeries,uncertaintySeries,fitSeries)/nu);
//  console.log(" and sqrt(area="+area+") of "+Math.sqrt(area)+" which is ratio of "+Math.sqrt(area)/area);

  //disengage fit mode buttons
  //  if( parseInt(refitPeak.getAttribute('engaged'),10) == 1){
  //    refitPeak.onclick();
  //  }
}

function addFitLines(){
  //add current fits to the plot

  var fitLines = [];
  var viewerName = dataStore.plots[0];

  dataStore.viewers[viewerName].containerFit.removeAllChildren();

  // Bail out of no fitResults yet
  if(!dataStore.fitResults[dataStore.currentPlot]){
    //  console.log('No fitResults yet for '+dataStore.currentPlot+' in addFitLines so bailing out');
    return;
  }

  var thisSelect = document.getElementById('refitSelect');
  if(thisSelect != null){
    // Set up the drop-down list of peaks available to refit
    thisSelect.removeAttribute('disabled');
    // Remove all options from the select
    thisSelect.innerHTML = "";
  }

  // Loop through the peaks for this spectrum
  for(i=0; i<dataStore.ROI[dataStore.currentPlot].length; i++){
    //add fit lines
    fitLines[i] = dataStore.viewers[viewerName].addFitLine(
      dataStore.ROI[dataStore.currentPlot][i][0],
      dataStore.ROI[dataStore.currentPlot][i][1] - dataStore.ROI[dataStore.currentPlot][i][0],
      dataStore.fitResults[dataStore.currentPlot][i][0],
      dataStore.fitResults[dataStore.currentPlot][i][1],
      dataStore.fitResults[dataStore.currentPlot][i][2],
      dataStore.fitResults[dataStore.currentPlot][i][3],
      dataStore.fitResults[dataStore.currentPlot][i][4]
    );

    // Add this fitline to the canvas
    dataStore.viewers[viewerName].containerFit.addChild(fitLines[i]);

    if(thisSelect != null){
      //add this peak as an option to the refit select
      var newSelect = document.createElement("select");
      thisSelect.add( new Option("Peak "+i+", "+dataStore.sourceInfo[dataStore.currentSource].literaturePeaks[i]+"keV", i) );
    }
  }

  dataStore.viewers[viewerName].stage.update();
}

function fitCOMInSeriesOfHistograms(spectra,peaks){
  //fit Centre-Of-Mass in all regions in all spectra defined.

  // Return a new promise.
  return new Promise(function(resolve, reject) {

    // Get the list of keys
    var i, keys = spectra,
    buffer = dataStore.currentPlot //keep track of whatever was originally plotted so we can return to it

    //dump data so there is one displayed at a time
    dataStore.viewers[dataStore.plots[0]].removeData(dataStore.currentPlot);

    releaser(
      function(i){
        // Set up the next spectra and peaks to fit
        var keys = spectra;
        var thisKey = keys[i];

        // Peak values must be integer as they represent bin/channel numbers
        var thesePeaks = [];
        for(var j=0; j<peaks[keys[i]].length; j++){
          thesePeaks.push(parseInt(peaks[keys[i]][j]));
        }

        // Update the progress bar by one task
        updateProgressBar(thesePeaks.length);

        // Call the fitting routine
        fitCOMSpectra(thisKey,thesePeaks)
      }.bind(this),

      function(){
        var evt;
        //set up fit line re-drawing
        dataStore.viewers[dataStore.plots[0]].drawCallback = addFitLines;

        // Callback
        fittingCOMCallback();

      }.bind(this),

      keys.length-1
    )

  }); // end of promise definition

}

function fitCOMSpectra(spectrum,peaks){
  // find the Center-Of-Mass (COM) for the named spectrum.
  //<spectrum>: string; name of spectrum, per names from analyzer

  var viewerName = dataStore.plots[0];
  var spectrumData = [];

  //set up fitting for this spectrum/source
  dataStore.currentPlot = spectrum;
  dataStore.viewers[viewerName].plotData() //kludge to update limits, could be nicer
  dataStore._plotListLite.exclusivePlot(spectrum, dataStore.viewers[dataStore.plots[0]]);

  //locate the spectrum in the dataStore
  if(spectrum in dataStore.createdSpectra){ // true if spectrum is a key of createdSpectra
    //set up the spectrum data for fitting
    spectrumData = JSON.parse(JSON.stringify(dataStore.createdSpectra[spectrum]));
  }else if(spectrum in dataStore.rawData){
    //set up the spectrum data for fitting
    spectrumData = JSON.parse(JSON.stringify(dataStore.rawData[spectrum]));
  }else{
    console.log("Failed to locate spectrum data for \'"+spectrum+"\' in fitCOMSpectra");
    return;
  }

  // Loop through the peaks to fit for this projection
  for(peakIndex=0; peakIndex<peaks.length; peakIndex++){
    dataStore.currentPeak = peakIndex;

    //Perform the actual Center-Of-Mass (COM) determination

    // Find the maximum bin which is close to peak centre
    var regionWidth = 100;
    var thisLowerLimit = peaks[peakIndex]-regionWidth;
    var thisUpperLimit = peaks[peakIndex]+regionWidth;
    var maxValue = 0; var maxIndex=-1; var index=0;
    for(k=thisLowerLimit; k<thisUpperLimit; k++){
      if(k>spectrumData.length-1){ continue; }
      if(isNaN(spectrumData[k])){ continue; }
      if(spectrumData[k]>maxValue){ maxValue = spectrumData[k]; maxIndex = index = k; }
    }

    // Find the rough FWHM - Do this from the outside inwards otherwise we get quickly stuck in false minima
    index = thisLowerLimit;
    while(spectrumData[index]<maxValue/2){ index++; }
    var ROIlowerLimit = maxIndex - (maxIndex-index)*3;
    index = thisUpperLimit;
    while(spectrumData[index]<maxValue/2){ index--; }
    var ROIupperLimit = maxIndex + (index-maxIndex)*3;

    // Reduce the sectionData to just the peak Region of Interest
    var thisSectionData = spectrumData.slice(ROIlowerLimit,ROIupperLimit);

    // Find the centre of mass of this peak
    var sum = sumProducts = sumSqDeviations = 0;
    for(k=0; k<thisSectionData.length; k++){
      if(isNaN(thisSectionData[k])){ continue; }
      sum += thisSectionData[k];
      sumProducts += thisSectionData[k] * (k+ROIlowerLimit);
    }
    var mean = sumProducts / sum;

    // Find the standard deviation (sigma or width)
    var sumSqDeviations = 0;
    for(k=ROIlowerLimit; k<ROIupperLimit; k++){
      if(isNaN(spectrumData[k])){ continue; }
      sumSqDeviations += ((k-mean)*(k-mean))*spectrumData[k];
    }
    var variance = sumSqDeviations / sum;
    var width = Math.sqrt(variance);
    var fwhm = width*2.35;

    // Find the rough amplitude
    var amplitude=0;
    for(k=parseInt(mean)-5; k<parseInt(mean)+6; k++){
      if(isNaN(spectrumData[k])){ continue; }
      amplitude += spectrumData[k];
    }
    amplitude /= 10;

    // Save the results
    //keep track of fit results and peak area
    if(!dataStore.fitResults[dataStore.currentPlot]) dataStore.fitResults[dataStore.currentPlot] = [];
    dataStore.fitResults[dataStore.currentPlot][dataStore.currentPeak] = [amplitude, mean, width, 1, 0, sum, fwhm];

    // Update the ROI
    // DO WE NEED ROI ANY MORE? Yes, for addFitLines
    if(!dataStore.ROI[dataStore.currentPlot]) dataStore.ROI[dataStore.currentPlot] = [];
    if(!dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak]) dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak] = [];
    dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][0] = ROIlowerLimit;
    dataStore.ROI[dataStore.currentPlot][dataStore.currentPeak][1] = ROIupperLimit;
  }

  //dump data so it doesn't stack up
  dataStore.viewers[viewerName].removeData(spectrum);
}

////////////////////
// Calibrations; Cal file, analyzer etc
////////////////////

function buildCalfile(){
  console.log('Download initiated - using buildCalfile function in helper.js');

  // Write the Cal file
  CAL = '';

  // Write this Cal file containing everything from the Config file that sorted this file.
  // Just replace any coefficients that we have newly determined

  for(var i=0; i<dataStore.Config.length; i++){
    var thisKey = dataStore.Config[i].name;
    CAL += thisKey+' { \n';
    CAL += 'Name:	'+thisKey+'\n';
    CAL += 'Number:	'+i+'\n';
    CAL += 'Address:  0x'+dataStore.Config[i].address.toString(16).toLocaleString(undefined, {minimumIntegerDigits: 2})+'\n';
    CAL += 'Digitizer:	GRF16\n';
    // Energy gain matching coefficients
    if( dataStore.THESEcalibrations[thisKey] && document.getElementById(thisKey+'write') ){
      if( document.getElementById(thisKey+'write').checked){
        CAL += 'EngCoeff:	'+dataStore.THESEcalibrations[thisKey]['fit'][2]+' '+dataStore.THESEcalibrations[thisKey]['fit'][1]+' '+dataStore.THESEcalibrations[thisKey]['fit'][0]+'\n';
      }else{
        CAL += 'EngCoeff:	'+dataStore.Config[i].offset+' '+dataStore.Config[i].gain+' '+dataStore.Config[i].quad+'\n';
      }
    }else if( dataStore.THESEcalibrations[thisKey] && (thisKey.includes("LBL") || thisKey.includes("LBT")) ){
      // Results from fastTimingCalibrations app
      CAL += 'EngCoeff:	'+dataStore.THESEcalibrations[thisKey]['fit'][2]+' '+dataStore.THESEcalibrations[thisKey]['fit'][1]+' '+dataStore.THESEcalibrations[thisKey]['fit'][0]+'\n';
    }else{
      CAL += 'EngCoeff:	'+dataStore.Config[i].offset+' '+dataStore.Config[i].gain+' '+dataStore.Config[i].quad+'\n';
    }
    if(thisKey.includes("GRG")){ // Only include pileup or crosstalk parameters for HPGe channels
      // Pileup correction parameters
      if( dataStore.THESEcalibrations[thisKey] ){
        if(typeof(dataStore.THESEcalibrations[thisKey].pileupk1) != "undefined"){ // newly derived in pileupCorrections app
          CAL += 'pileupk1:	'+dataStore.THESEcalibrations[thisKey]['pileupk1'][0]+' '+dataStore.THESEcalibrations[thisKey]['pileupk1'][1]+' '+dataStore.THESEcalibrations[thisKey]['pileupk1'][2];
          CAL +=          ' '+dataStore.THESEcalibrations[thisKey]['pileupk1'][3]+' '+dataStore.THESEcalibrations[thisKey]['pileupk1'][4]+' '+dataStore.THESEcalibrations[thisKey]['pileupk1'][5]+' '+dataStore.THESEcalibrations[thisKey]['pileupk1'][6]+'\n';

          CAL += 'pileupk2:	'+dataStore.THESEcalibrations[thisKey]['pileupk2'][0]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][1]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][2];
          CAL +=          ' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][3]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][4]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][5]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][6]+'\n';

          CAL += 'pileupE1:	'+dataStore.THESEcalibrations[thisKey]['pileupE1'][0]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][1]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][2];
          CAL +=          ' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][3]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][4]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][5]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][6]+'\n';
        }else if(typeof(dataStore.Config[i].pileupk1) != "undefined"){ // take from Config file that sorted this run
          CAL += 'pileupk1:	'+dataStore.Config[i].pileupk1[0]+' '+dataStore.Config[i].pileupk1[1]+' '+dataStore.Config[i].pileupk1[2];
          CAL +=          ' '+dataStore.Config[i].pileupk1[3]+' '+dataStore.Config[i].pileupk1[4]+' '+dataStore.Config[i].pileupk1[5]+' '+dataStore.Config[i].pileupk1[6]+'\n';

          CAL += 'pileupk2:	'+dataStore.Config[i].pileupk2[0]+' '+dataStore.Config[i].pileupk2[1]+' '+dataStore.Config[i].pileupk2[2];
          CAL +=          ' '+dataStore.Config[i].pileupk2[3]+' '+dataStore.Config[i].pileupk2[4]+' '+dataStore.Config[i].pileupk2[5]+' '+dataStore.Config[i].pileupk2[6]+'\n';

          CAL += 'pileupE1:	'+dataStore.Config[i].pileupE1[0]+' '+dataStore.Config[i].pileupE1[1]+' '+dataStore.Config[i].pileupE1[2];
          CAL +=          ' '+dataStore.Config[i].pileupE1[3]+' '+dataStore.Config[i].pileupE1[4]+' '+dataStore.Config[i].pileupE1[5]+' '+dataStore.Config[i].pileupE1[6]+'\n';
        }else{ // insert default
          CAL += 'pileupk1:	1 0 0 0 0 0 0\n';
          CAL += 'pileupk2:	1 0 0 0 0 0 0\n';
          CAL += 'pileupE1:	0 0 0 0 0 0 0\n';
        }
      }else if(typeof(dataStore.Config[i].pileupk1) != "undefined"){ // take from Config file that sorted this run
        CAL += 'pileupk1:	'+dataStore.Config[i].pileupk1[0]+' '+dataStore.Config[i].pileupk1[1]+' '+dataStore.Config[i].pileupk1[2];
        CAL +=          ' '+dataStore.Config[i].pileupk1[3]+' '+dataStore.Config[i].pileupk1[4]+' '+dataStore.Config[i].pileupk1[5]+' '+dataStore.Config[i].pileupk1[6]+'\n';

        CAL += 'pileupk2:	'+dataStore.Config[i].pileupk2[0]+' '+dataStore.Config[i].pileupk2[1]+' '+dataStore.Config[i].pileupk2[2];
        CAL +=          ' '+dataStore.Config[i].pileupk2[3]+' '+dataStore.Config[i].pileupk2[4]+' '+dataStore.Config[i].pileupk2[5]+' '+dataStore.Config[i].pileupk2[6]+'\n';

        CAL += 'pileupE1:	'+dataStore.Config[i].pileupE1[0]+' '+dataStore.Config[i].pileupE1[1]+' '+dataStore.Config[i].pileupE1[2];
        CAL +=          ' '+dataStore.Config[i].pileupE1[3]+' '+dataStore.Config[i].pileupE1[4]+' '+dataStore.Config[i].pileupE1[5]+' '+dataStore.Config[i].pileupE1[6]+'\n';
      }else{ // insert default
        CAL += 'pileupk1:	1 0 0 0 0 0 0\n';
        CAL += 'pileupk2:	1 0 0 0 0 0 0\n';
        CAL += 'pileupE1:	0 0 0 0 0 0 0\n';
      }
      // Crosstalk correction parameters
      if( dataStore.THESEcalibrations[thisKey] ){
        if(typeof(dataStore.THESEcalibrations[thisKey].crosstalk0) != "undefined"){ // newly derived in crosstalkCorrections app
          CAL += 'crosstalk0:	';
          for(var k=0; k<16; k++){ CAL += dataStore.THESEcalibrations[thisKey]['crosstalk0'][k].toFixed(8)+' ' }
          CAL += '\n';
          CAL += 'crosstalk1:	';
          for(var k=0; k<16; k++){ CAL += dataStore.THESEcalibrations[thisKey]['crosstalk1'][k].toFixed(8)+' ' }
          CAL += '\n';
          CAL += 'crosstalk2:	';
          for(var k=0; k<16; k++){ CAL += dataStore.THESEcalibrations[thisKey]['crosstalk2'][k].toFixed(8)+' ' }
          CAL += '\n';
        }else if(typeof(dataStore.Config[i].crosstalk0) != "undefined"){ // take from Config file that sorted this run
          CAL += 'crosstalk0:	';
          for(var k=0; k<16; k++){ CAL += dataStore.Config[i].crosstalk0[k].toFixed(8)+' ' }
          CAL += '\n';
          CAL += 'crosstalk1:	';
          for(var k=0; k<16; k++){ CAL += dataStore.Config[i].crosstalk1[k].toFixed(8)+' ' }
          CAL += '\n';
          CAL += 'crosstalk2:	';
          for(var k=0; k<16; k++){ CAL += dataStore.Config[i].crosstalk2[k].toFixed(8)+' ' }
          CAL += '\n';
        }else{ // insert default
          CAL += 'crosstalk0:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
          CAL += 'crosstalk1:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
          CAL += 'crosstalk2:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
        }
      }else if(typeof(dataStore.Config[i].crosstalk0) != "undefined"){ // take from Config file that sorted this run
        CAL += 'crosstalk0:	';
        for(var k=0; k<16; k++){ CAL += dataStore.Config[i].crosstalk0[k].toFixed(8)+' ' }
        CAL += '\n';
        CAL += 'crosstalk1:	';
        for(var k=0; k<16; k++){ CAL += dataStore.Config[i].crosstalk1[k].toFixed(8)+' ' }
        CAL += '\n';
        CAL += 'crosstalk2:	';
        for(var k=0; k<16; k++){ CAL += dataStore.Config[i].crosstalk2[k].toFixed(8)+' ' }
        CAL += '\n';
      }else{ // insert default
        CAL += 'crosstalk0:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
        CAL += 'crosstalk1:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
        CAL += 'crosstalk2:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
      }
    }
    CAL += 'Integration:	0\n';
    CAL += 'ENGChi2:	0\n';
    CAL += 'FileInt:	0\n';
    CAL += '}\n';
    CAL += '\n';
    CAL += '//====================================//\n';
  }

  // fastTimingCalibrations app, TAC offsets - add these to the end of the Cal file if they exist
  if(dataStore.comboOffsets){

    var tac_offset_name = [
      "TAC_01_02", "TAC_01_03", "TAC_01_04", "TAC_01_05", "TAC_01_06", "TAC_01_07", "TAC_01_08",
      "TAC_02_03", "TAC_02_04", "TAC_02_05", "TAC_02_06", "TAC_02_07", "TAC_02_08",
      "TAC_03_04", "TAC_03_05", "TAC_03_06", "TAC_03_07", "TAC_03_08",
      "TAC_04_05", "TAC_04_06", "TAC_04_07", "TAC_04_08",
      "TAC_05_06", "TAC_05_07", "TAC_05_08",
      "TAC_06_07", "TAC_06_08",
      "TAC_07_08",
      "TAC_02_01"
    ];

    // TAC_OFFSET parameters for the different LBL-LBL combinations
    for(var i=0; i<dataStore.comboOffsets.length; i++){
      CAL += "TAC_OFFSET"+' { \n';
      CAL += 'Name:	'+tac_offset_name[i]+'\n';
      CAL += 'EngCoeff:	'+dataStore.comboOffsets[i]+' '+tac_offset_name[i].split("_")[1]+' '+tac_offset_name[i].split("_")[2]+'\n';
      CAL += '}\n';
      CAL += '\n';
      CAL += '//====================================//\n';
    }
  }

  if(dataStore.Config.length==0){
    CAL += '// Empty Config file extracted for '+dataStore.histoFileDirectoryPath+'/'+dataStore.histoFileName+'\n';
    CAL += '// Including only channels with newly-derived calibration';

    var keys = Object.keys(dataStore.THESEcalibrations);
    for(var i=0; i<keys.length; i++){
      var thisKey = dataStore.THESEcalibrations[i];
      CAL += thisKey+' { \n';
      CAL += 'Name:	'+thisKey+'\n';
      CAL += 'Number:	'+i+'\n';
      //CAL += 'Address:  0x0000\n';
      CAL += 'Digitizer:	GRF16\n';
      if( document.getElementById(thisKey+'write').checked ){
        CAL += 'EngCoeff:	'+dataStore.THESEcalibrations[thisKey]['fit'][2]+' '+dataStore.THESEcalibrations[thisKey]['fit'][1]+' '+dataStore.THESEcalibrations[thisKey]['fit'][0]+'\n';
      }else{
        CAL += 'EngCoeff:	0 1 0\n'
      }
      CAL += 'Integration:	0\n';
      CAL += 'ENGChi2:	0\n';
      CAL += 'FileInt:	0\n';
      CAL += '}\n';
      CAL += '\n';
      CAL += '//====================================//\n';
    }
  }

  // Create a download link
  const textBlob = new Blob([CAL], {type: 'text/plain'});
  URL.revokeObjectURL(window.textBlobURL);
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(textBlob);
  downloadLink.download = document.getElementById('saveCalname').value;

  // Trigger the download
  document.body.appendChild(downloadLink);
  downloadLink.click();
}

function buildJSONfile(){
  console.log('Download initiated - using buildJSONfile function in helper.js');

  // Write the JSON file
  JSON = '';

  // Variable
  JSON += "{";
  JSON += "   \"Analyzer\" : [";
  JSON += "      {\"Variables\" : [";
  JSON += "      ]},";

  // Gates, Histograms, Globals
  JSON += "      {\"Gates\" : [";
  JSON += "      ]},";
  JSON += "      {\"Histograms\" : [";
  JSON += "      ]},";
  JSON += "      {\"Globals\" : [";
  JSON += "      ]},";

  // Calibrations
  // Write this JSON file containing everything from the Config file that sorted this file.
  // Just replace any coefficients that we have newly determined
  JSON += "      {\"Calibrations\" : [";

  for(var i=0; i<dataStore.Config.length; i++){
    var thisKey = dataStore.Config[i].name;
    JSON += thisKey+' { \n';
    JSON += '\"name\" : \"'+thisKey+'\" , ';
    JSON += '\"address\" : 0x'+dataStore.Config[i].address.toString(16).toLocaleString(undefined, {minimumIntegerDigits: 2})+' , ';
    JSON += '\"datatype\" : \"'+ -1 +'\" , ';

    // Energy gain matching coefficients
    if( dataStore.THESEcalibrations[thisKey] && document.getElementById(thisKey+'write')){
      if( document.getElementById(thisKey+'write').checked){
        JSON += '\"offset\" : '+dataStore.THESEcalibrations[thisKey]['fit'][2]+' , ';
        JSON += '\"gain\" : '+dataStore.THESEcalibrations[thisKey]['fit'][1]+' , ';
        JSON += '\"quad\" : '+dataStore.THESEcalibrations[thisKey]['fit'][0]+' ';
      }else{
        JSON += '\"offset\" : '+dataStore.Config[i].offset+' , ';
        JSON += '\"gain\" : '+dataStore.Config[i].gain+' , ';
        JSON += '\"quad\" : '+dataStore.Config[i].quad+' ';
      }
    }else{
      JSON += '\"offset\" : '+dataStore.Config[i].offset+' , ';
      JSON += '\"gain\" : '+dataStore.Config[i].gain+' , ';
      JSON += '\"quad\" : '+dataStore.Config[i].quad+' ';
    }
    if(thisKey.includes("GRG")){ // Only include pileup or crosstalk parameters for HPGe channels
      // Pileup correction parameters
      if( dataStore.THESEcalibrations[thisKey] ){
        if(typeof(dataStore.THESEcalibrations[thisKey].pileupk1) != "undefined"){ // newly derived in pileupCorrections app
          JSON += ', \"pileupk1\" : [ '+dataStore.THESEcalibrations[thisKey]['pileupk1'][0]+' , '+dataStore.THESEcalibrations[thisKey]['pileupk1'][1]+' , '+dataStore.THESEcalibrations[thisKey]['pileupk1'][2];
          JSON +=                 ' , '+dataStore.THESEcalibrations[thisKey]['pileupk1'][3]+' , '+dataStore.THESEcalibrations[thisKey]['pileupk1'][4]+' , '+dataStore.THESEcalibrations[thisKey]['pileupk1'][5]+' , '+dataStore.THESEcalibrations[thisKey]['pileupk1'][6]+' ] ';

          JSON += 'pileupk2:	'+dataStore.THESEcalibrations[thisKey]['pileupk2'][0]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][1]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][2];
          JSON +=           ' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][3]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][4]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][5]+' '+dataStore.THESEcalibrations[thisKey]['pileupk2'][6]+'\n';

          JSON += 'pileupE1:	'+dataStore.THESEcalibrations[thisKey]['pileupE1'][0]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][1]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][2];
          JSON +=           ' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][3]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][4]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][5]+' '+dataStore.THESEcalibrations[thisKey]['pileupE1'][6]+'\n';
        }else if(typeof(dataStore.Config[i].pileupk1) != "undefined"){ // take from Config file that sorted this run
          JSON += 'pileupk1:	'+dataStore.Config[i].pileupk1[0]+' '+dataStore.Config[i].pileupk1[1]+' '+dataStore.Config[i].pileupk1[2];
          JSON +=           ' '+dataStore.Config[i].pileupk1[3]+' '+dataStore.Config[i].pileupk1[4]+' '+dataStore.Config[i].pileupk1[5]+' '+dataStore.Config[i].pileupk1[6]+'\n';

          JSON += 'pileupk2:	'+dataStore.Config[i].pileupk2[0]+' '+dataStore.Config[i].pileupk2[1]+' '+dataStore.Config[i].pileupk2[2];
          JSON +=           ' '+dataStore.Config[i].pileupk2[3]+' '+dataStore.Config[i].pileupk2[4]+' '+dataStore.Config[i].pileupk2[5]+' '+dataStore.Config[i].pileupk2[6]+'\n';

          JSON += 'pileupE1:	'+dataStore.Config[i].pileupE1[0]+' '+dataStore.Config[i].pileupE1[1]+' '+dataStore.Config[i].pileupE1[2];
          JSON +=           ' '+dataStore.Config[i].pileupE1[3]+' '+dataStore.Config[i].pileupE1[4]+' '+dataStore.Config[i].pileupE1[5]+' '+dataStore.Config[i].pileupE1[6]+'\n';
        }else{ // insert default
          JSON += 'pileupk1:	1 0 0 0 0 0 0\n';
          JSON += 'pileupk2:	1 0 0 0 0 0 0\n';
          JSON += 'pileupE1:	0 0 0 0 0 0 0\n';
        }
      }else if(typeof(dataStore.Config[i].pileupk1) != "undefined"){ // take from Config file that sorted this run
        JSON += 'pileupk1:	'+dataStore.Config[i].pileupk1[0]+' '+dataStore.Config[i].pileupk1[1]+' '+dataStore.Config[i].pileupk1[2];
        JSON +=           ' '+dataStore.Config[i].pileupk1[3]+' '+dataStore.Config[i].pileupk1[4]+' '+dataStore.Config[i].pileupk1[5]+' '+dataStore.Config[i].pileupk1[6]+'\n';

        JSON += 'pileupk2:	'+dataStore.Config[i].pileupk2[0]+' '+dataStore.Config[i].pileupk2[1]+' '+dataStore.Config[i].pileupk2[2];
        JSON +=           ' '+dataStore.Config[i].pileupk2[3]+' '+dataStore.Config[i].pileupk2[4]+' '+dataStore.Config[i].pileupk2[5]+' '+dataStore.Config[i].pileupk2[6]+'\n';

        JSON += 'pileupE1:	'+dataStore.Config[i].pileupE1[0]+' '+dataStore.Config[i].pileupE1[1]+' '+dataStore.Config[i].pileupE1[2];
        JSON +=           ' '+dataStore.Config[i].pileupE1[3]+' '+dataStore.Config[i].pileupE1[4]+' '+dataStore.Config[i].pileupE1[5]+' '+dataStore.Config[i].pileupE1[6]+'\n';
      }else{ // insert default
        JSON += 'pileupk1:	1 0 0 0 0 0 0\n';
        JSON += 'pileupk2:	1 0 0 0 0 0 0\n';
        JSON += 'pileupE1:	0 0 0 0 0 0 0\n';
      }
      // Crosstalk correction parameters
      if( dataStore.THESEcalibrations[thisKey] ){
        if(typeof(dataStore.THESEcalibrations[thisKey].crosstalk0) != "undefined"){ // newly derived in crosstalkCorrections app
          JSON += 'crosstalk0:	';
          for(var k=0; k<16; k++){ JSON += dataStore.THESEcalibrations[thisKey]['crosstalk0'][k].toFixed(8)+' ' }
          JSON += '\n';
          JSON += 'crosstalk1:	';
          for(var k=0; k<16; k++){ JSON += dataStore.THESEcalibrations[thisKey]['crosstalk1'][k].toFixed(8)+' ' }
          JSON += '\n';
          JSON += 'crosstalk2:	';
          for(var k=0; k<16; k++){ JSON += dataStore.THESEcalibrations[thisKey]['crosstalk2'][k].toFixed(8)+' ' }
          JSON += '\n';
        }else if(typeof(dataStore.Config[i].crosstalk0) != "undefined"){ // take from Config file that sorted this run
          JSON += 'crosstalk0:	';
          for(var k=0; k<16; k++){ JSON += dataStore.Config[i].crosstalk0[k].toFixed(8)+' ' }
          JSON += '\n';
          JSON += 'crosstalk1:	';
          for(var k=0; k<16; k++){ JSON += dataStore.Config[i].crosstalk1[k].toFixed(8)+' ' }
          JSON += '\n';
          JSON += 'crosstalk2:	';
          for(var k=0; k<16; k++){ JSON += dataStore.Config[i].crosstalk2[k].toFixed(8)+' ' }
          JSON += '\n';
        }else{ // insert default
          JSON += 'crosstalk0:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
          JSON += 'crosstalk1:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
          JSON += 'crosstalk2:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
        }
      }else if(typeof(dataStore.Config[i].crosstalk0) != "undefined"){ // take from Config file that sorted this run
        JSON += 'crosstalk0:	';
        for(var k=0; k<16; k++){ JSON += dataStore.Config[i].crosstalk0[k].toFixed(8)+' ' }
        JSON += '\n';
        JSON += 'crosstalk1:	';
        for(var k=0; k<16; k++){ JSON += dataStore.Config[i].crosstalk1[k].toFixed(8)+' ' }
        JSON += '\n';
        JSON += 'crosstalk2:	';
        for(var k=0; k<16; k++){ JSON += dataStore.Config[i].crosstalk2[k].toFixed(8)+' ' }
        JSON += '\n';
      }else{ // insert default
        JSON += 'crosstalk0:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
        JSON += 'crosstalk1:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
        JSON += 'crosstalk2:	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n';
      }
    }
    JSON += 'Integration:	0\n';
    JSON += 'ENGChi2:	0\n';
    JSON += 'FileInt:	0\n';
    JSON += '}\n';
    JSON += '\n';
    JSON += '//====================================//\n';
  }

  JSON += "      ]},";

  // Directories
  JSON += "          {\"Directories\" : [";
  JSON += "             {\"name\" : \"Data\", \"Path\" : \"\"},";
  JSON += "             {\"name\" : \"Histo\", \"Path\" : \"\"},";
  JSON += "             {\"name\" : \"Config\", \"Path\" : \"\"}";
  JSON += "          ]},";

  // Midas
  JSON += "          {\"Midas\" : [";
  JSON += "             {\"name\" : \"Title\", \"Value\" : \"\"},";
  JSON += "             {\"name\" : \"StartTime\", \"Value\" : \"0\"},";
  JSON += "             {\"name\" : \"Duration\", \"Value\" : \"0\"}";
  JSON += "          ]}";
  JSON += "       ]";
  JSON += "      }";

  // Create a download link
  const textBlob = new Blob([JSON], {type: 'text/plain'});
  URL.revokeObjectURL(window.textBlobURL);
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(textBlob);
  downloadLink.download = document.getElementById('saveJSONname').value;

  // Trigger the download
  document.body.appendChild(downloadLink);
  downloadLink.click();
}


function buildCSVfile(){
  console.log('Download initiated - using buildCSVfile function in helper.js');
  var keys = Object.keys(dataStore.fitResults);
  var index = 1;

  // Write the table of results to a CSV file for download.
  var CSV = '';

  CSV += 'GRIFFIN Peak Fitter Results Data\n\n';

  //fit results: 'plotname': [[amplitude, center, width, intercept, slope, area, FWHM], [amplitude, center, width, intercept, slope, area, FWHM]]

  CSV += 'Fit Index,';
  CSV += 'Histogram File,';
  CSV += 'Run Title,Run StartTime,Run Duration,';
  CSV += 'Spectrum,';
  CSV += 'Centroid,'; //
  CSV += 'Height,'; //
  CSV += 'Width,'; //
  CSV += 'Intercept (BG),'; //
  CSV += 'Slope (BG),'; //
  CSV += 'Area,'; //
  CSV += 'Area Unc.,'; //
  CSV += 'FWHM\n'; //
  for(var i=0; i<keys.length; i++){
    for(var j=0; j<dataStore.fitResults[keys[i]].length; j++){
      CSV += index + ','; index++;
      CSV += keys[i].split(":")[0] + ',';
      CSV += dataStore.spectrumListHistoFileDetails[keys[i].split(":")[0]].Title + ',';
      CSV += dataStore.spectrumListHistoFileDetails[keys[i].split(":")[0]].StartTime + ',';
      CSV += dataStore.spectrumListHistoFileDetails[keys[i].split(":")[0]].Duration + ',';
      CSV += keys[i].split(":")[1] + ',';
      CSV += dataStore.fitResults[keys[i]][j][1].toFixed(2) + ','; // Center
      CSV += dataStore.fitResults[keys[i]][j][0].toFixed(2) + ','; // Amplitude
      CSV += dataStore.fitResults[keys[i]][j][2].toFixed(2) + ','; // width
      CSV += dataStore.fitResults[keys[i]][j][3].toFixed(2) + ','; // intercept
      CSV += dataStore.fitResults[keys[i]][j][4].toFixed(2) + ','; // slope
      CSV += dataStore.fitResults[keys[i]][j][5].toFixed(2) + ','; // area
      CSV += Math.sqrt(dataStore.fitResults[keys[i]][j][5]).toFixed(2) + ','; // area uncertainty
      CSV += dataStore.fitResults[keys[i]][j][6].toFixed(2) + '\n'; // FWHM
    }
  }
  CSV += '\n';

  // Create a download link
  const textBlob = new Blob([CSV], {type: 'text/plain'});
  URL.revokeObjectURL(window.textBlobURL);
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(textBlob);
  downloadLink.download = 'GRIFFIN-peakFitter-Results.csv';

  // Trigger the download
  document.body.appendChild(downloadLink);
  downloadLink.click();
}

function buildScriptfile(){
  console.log('Download initiated');

  // Write the contents of the json script to a file for download.
  var JSONstring = '';
  JSONstring = JSON.stringify(dataStore.peakFitterScript, null, 4);

  // Need to purge some spectrum specific peak entries if they match All.

  // Create a download link
  const textBlob = new Blob([JSONstring], {type: 'text/plain'});
  URL.revokeObjectURL(window.textBlobURL);
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(textBlob);
  downloadLink.download = 'GRIFFIN-peakFitter-script.json';

  // Trigger the download
  document.body.appendChild(downloadLink);
  downloadLink.click();
}

////////////////////
// Plotly.js
////////////////////

function createPlotlyScatterPlot(xSeries,ySeries,yErrSeries,layout,parentDiv,traceNames){
  // x series data. Must be an array of arrays to allow for multiple series plot.
  // y series data. Must be an array of arrays to allow for multiple series plot.
  // y error series data to make y error bars. Must be an array of arrays to allow for multiple series plot.
  // layout is passed directly. It ideally comes from a template but can include any valid plotly options.
  // See https://plotly.com/javascript/configuration-options/
  // parentDiv id is the div for the plot to be inserted into
  // traceNames is optional. Array of names/titles, one for each series that will appear in the legend
  var data = []; // data is an array of objects required for a plotly scatter plot
  var config =  // configuration options for plotly
  {
    scrollZoom: true,
    modeBarButtonsToRemove: ['sendDataToCloud','select2d','lasso2d']
  };

  for(i=0; i<xSeries.length; i++){
    data[i] =
    {
      x: xSeries[i],
      y: ySeries[i],
      mode: 'markers',
      type: 'scatter'
    };
    if(traceNames){ data[i]['name'] = traceNames[i]; }

    // If yErrSeries is provided then activate the error bars
    if(yErrSeries.length>0){
      console.log("Add errorBars");
      data[i].error_y = {
        type: 'data',
        array: yErrSeries[i],
        visible: true
      };
    }
  }

  // Now create the Plotly plot
  Plotly.newPlot(parentDiv, data, layout, config);

}

////////////////////
// Dygraphs
////////////////////

function arrangePoints(x, y, flags){
  //arrange an array of x values, an array of arrays of y values, and data series flag for consumption by dygraphs
  //see test suite for examples of behavior.
  //
  // Example input to this function. flags is a single array with length of x series.
  // Pass multiple y series as a comma separated array of arrays
  //flags.fillN(0, dataStore.THESEdetectors.length)
  //dataStore.resolutionData = arrangePoints(detectorIndex, [dataStore.PeakResolution[0], dataStore.PeakResolution[1], dataStore.PeakResolution[2], dataStore.PeakResolution[3]], flags );

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

function construct2dQueries(queries,keys){
  //takes a list of plot names and produces the query string needed to fetch them, in an array
  //Each request is split into separate queries to properly handle 2d histograms.
  // queries is assumed to be the queries array built by constructQueries() and we add to it.

  var i, queryString;
  var j=0;
  if(queries.length>0){
    j = ((queries.length-1)*16) + (queries[queries.length-1].match(/spectrum/g) || []).length;
  }
  for(i=0; i<keys.length; i++){
    queryString = dataStore.spectrumServer + '?cmd=callbinaryspechandler';
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
    queryString += '&spectrum' + j + '=' + keys[i];
    j++;

    queries.push(queryString);
  }
  return queries
}

//////////////////////////
// 2D spectrum viewer
//////////////////////////

function projectXaxis(gateMin,gateMax,type,parentPlotname){
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
  if(type == 'BG1'){
    dataStore.createdBG1Spectra[parentPlotname] = thisProjection;
  }else if(type == 'BG2'){
    dataStore.createdBG2Spectra[parentPlotname] = thisProjection;
  }else{
    dataStore.createdSpectra[thisProjectionName] = thisProjection;
  }

  return thisProjectionName;
}

function projectYaxis(gateMin,gateMax,type,parentPlotname){
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
  if(type == 'BG1'){
    dataStore.createdBG1Spectra[parentPlotname] = thisProjection;
  }else if(type == 'BG2'){
    dataStore.createdBG2Spectra[parentPlotname] = thisProjection;
  }else{
    dataStore.createdSpectra[thisProjectionName] = thisProjection;
  }

  return thisProjectionName;
}

function projectXY(gateMinX,gateMaxX,gateMinY,gateMaxY,axis){
  // 2d histogram data is stored as an array of arrays; data[y][x]
  // An x axis slice is accessed as data[0->Ylength][x] = a speciifc element of a series of arrays.
  // A y axis bin is accessed as data[y][0->Xlengthy] = array of all x bins.
  // Individual elements can be accessed as data[y][x].
  // this function projects x elements between two limits across to a single array by summing the elements between gateMinY and gateMaxY rows.

  // If no limits for the gate/projection are provided then make a total projection
  if(gateMinX == undefined || gateMinX<1) gateMinX = 0;
  if(gateMinY == undefined || gateMinY<1) gateMinY = 0;
  if(gateMaxX == undefined){
    gateMaxX = dataStore.hm._raw.length-1;
  }
  if(gateMaxY == undefined){
    gateMaxY = dataStore.hm._raw[0].length-1;
  }

  // Set up the projection spectrum
  var thisProjection = [];
  for(let i=0; i<dataStore.hm._raw.length; i++){
    thisProjection[i] = 0;
  }

  // Make the projection onto the stated axis
  if(axis == 'y'){
    // Set a unique name based on gate limits
    thisProjectionName = dataStore.activeMatrix+'y-'+gateMinX+'-'+gateMaxX;

    // build the Y projection from the sum of the elements between the gate min and max values of all arrays.
    for(let i=gateMinY; i<gateMaxY; i++){
      thisProjection[i] = dataStore.hm._raw[i].slice(gateMinX,gateMaxX).reduce((a, b) => a + b, 0);
    }
  }else{
    // Set a unique name based on gate limits
    thisProjectionName = dataStore.activeMatrix+'x-'+gateMinY+'-'+gateMaxY;

    // build the projection from the sum of the arrays between the gate min and max values.
    for(let j=gateMinX; j<gateMaxX; j++){
      for(let i=gateMinY; i<gateMaxY; i++){
        thisProjection[j] += dataStore.hm._raw[i][j];
      }
    }
  }

  // Ensure there are no NaN entries
  for(i=0; i<thisProjection.length; i++){
    if(isNaN(thisProjection[i])){ thisProjection[i]=0; }
  }

  // write the created spectrum to the storage object
  dataStore.createdSpectra[thisProjectionName] = thisProjection;

  return thisProjectionName;
}

function packZcompressed(raw2,XaxisLength,YaxisLength,Zmax,symmeterize,generateColorMap){
  // histo z values arrive as [row length, x0y0, x1y0, ..., x0y1, x1y1, ..., xmaxymax]
  // heatmap wants it as [[x0y0, x1y0, ..., xmaxy0], [x0y1, x1y1, ..., xmaxy1], ...]
  //  console.log('unpackZ');
  // console.log(raw);
  // console.log(raw2);

  // Generate a color map by default
  if(generateColorMap == 'undefined'){ generateColorMap = true; }

  // Set axis lengths if they have not been provided
  if(XaxisLength == 'undefined'){ XaxisLength = activeMatrixXaxisLength; }
  if(YaxisLength == 'undefined'){ YaxisLength = activeMatrixYaxisLength; }
  if(Zmax == 'undefined'){ Zmax = dataStore.hm.zmaxfull; }
  if(symmeterize == 'undefined'){ symmeterize = false; }

  // Declare local variables
  var repack = [], repack2 = [],
  rowLength = XaxisLength,
  nRows = YaxisLength,
  subMatrixXlength = 16,
  subMatrixYlength = 16,
  i, j, subMatrixType, row=[];
  var matrixMinValue = 0;
  var matrixMaxValue = Zmax;
  //    console.log(rowLength);
  //    console.log(nRows);

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
    repack2[i] = new Array(rowLength).fill(0); // Creating an array of size rowLength and filled of 0
  }

  // Create a full color map for this matrix. Building this now saves the time of accessing all elements again later.
  // First check if a color map exists for this matrix. If so, zero it. If not, create it.
  if(generateColorMap){
    try{ objectIndex = dataStore.hm.colorMap.map(e => e.matrix).indexOf(dataStore.activeMatrix);
      //  console.log('A colorMap exists for this matrix.');
    }
    catch(err){ console.log('No colorMap for this matrix.'); objectIndex=-1; }

    if(objectIndex<0){
      // A colorMap for this matrix does not exist, so we need to create space for it
      let name = dataStore.activeMatrix;
      newMatrix = {
        "matrix" : dataStore.activeMatrix,
        "data" : []
      }
      if(dataStore.hm.colorMap == undefined){ dataStore.hm.colorMap = []; }
      dataStore.hm.colorMap.push(newMatrix);
      objectIndex = dataStore.hm.colorMap.map(e => e.matrix).indexOf(dataStore.activeMatrix);
    }else{
      //  console.log('zero the color map and build it for this zoomed region');
      dataStore.hm.colorMap[objectIndex].data = [];
    }
  }

  subMatrixIndexValue=-1;
  for(subMatrixIndex=0; subMatrixIndex<raw2.length; subMatrixIndex++){
    // Step through the subMatrix arrays one at a time.
    subMatrixIndexValue++;

    // Calculate the subMatrix Coordinates
    subMatrixX = (Math.floor(subMatrixIndexValue%Math.floor(rowLength/subMatrixXlength)));
    subMatrixY = (Math.floor(subMatrixIndexValue/Math.floor(rowLength/subMatrixXlength)));
    subMatrixXbaseCoordinate = subMatrixX*subMatrixXlength;
    subMatrixYbaseCoordinate = subMatrixY*subMatrixYlength;
    //	console.log('SubMatrix '+subMatrixIndex+', '+subMatrixIndexValue+' ['+subMatrixX+']['+subMatrixY+']');

    if(Number.isInteger(raw2[subMatrixIndex][0])){
      // Process the current 16*16=256 values. Add them to the local matrix and the heatmap
      // the subMatrixType will be communicated as an integer value between 0 and 8 (1 byte)
      // 0 = empty
      // 1 = list type with 8-bit values
      // 2 = list type with 16-bit values
      // 3 = list type with 32-bit values
      // 4 = list type with 64-bit values
      // 5 = array type with 8-bit values
      // 6 = array type with 16-bit values
      // 7 = array type with 32-bit values
      // 8 = array type with 64-bit values
      subMatrixType = parseInt(raw2[subMatrixIndex][0]);
      switch(subMatrixType) {
        case 0: // empty
        // empty type now indicates the number of sequential empty submatrices.
        // Need to use this value to advance the base coordinates for the next submatrix
        //  console.log('Empty type, advance '+(parseInt(raw2[subMatrixIndex][1]))+' submatrices');
        subMatrixIndexValue += parseInt(raw2[subMatrixIndex][1])-1;

        // empty format, nothing more to be done
        break;
        case 5: // array with 6-bit values
        case 6: // array with 12-bit values
        case 7: // array with 18-bit values
        case 8: // array with 24-bit values
        // array format
        // 256 z values are given in order.
        // The values are given in the order of x0y0, x1y0, ..., x0y1, x1y1, ..., xmaxymax
        //  console.log(raw2[subMatrixIndex]);
        // type = raw2[subMatrixIndex].shift();

        thisArrayString = raw2[subMatrixIndex][1];
        thisArrayValueSize = Math.floor((thisArrayString.length)/256);
        thisIndex = 0;

        for(i=0; i<subMatrixYlength; i++){
          for(j=1; j<=subMatrixXlength; j++){ // j=0 entry is the subMatrix type
            thisXindex = subMatrixXbaseCoordinate+j;
            thisYindex = subMatrixYbaseCoordinate+i;
            thisValueString = thisArrayString.substr(thisIndex,thisArrayValueSize);
            thisValue = 0;

            thisShift=0;
            for(x=thisValueString.length-1; x>=0; x--){
              thisByte = thisValueString[x].charCodeAt();
              if(thisByte == 60){ thisByte = 92; }
              thisByte -= 64;
              thisValue = thisValue | (thisByte << (thisShift * 6));
              thisShift++;
            }
            repack2[thisYindex][thisXindex] = thisValue;
            if(symmeterize){ repack2[thisXindex][thisYindex] = thisValue; }
            if(thisValue>matrixMaxValue){ matrixMaxValue = thisValue; } // Update the max Z value
            if(generateColorMap){
              dataStore.hm.addPointToColorMap(objectIndex,thisYindex,thisXindex,thisValue); // Add this point to the color Map
              if(symmeterize){ dataStore.hm.addPointToColorMap(objectIndex,thisXindex,thisYindex,thisValue); }
            }
            thisIndex += thisArrayValueSize;
          }
        }

        break;
        case 1: // list with 8-bit values
        case 2: // list with 16-bit values
        case 3: // list with 32-bit values
        case 4: // list with 64-bit values
        // list format
        // The values are in pairs of [bin number within this submatrix, 0-255], then [z value]
        // console.log(raw2[subMatrixIndex]);
        // type = raw2[subMatrixIndex].shift();
        thisIndex=-1;
        for(i=1; i<9; i+=2){ // Loop through the four sets of coord+value strings per subMatrix. i=0 entry is the subMatrix type
          ++thisIndex;
          thisCoordString = raw2[subMatrixIndex][i+0];
          thisArrayString = raw2[subMatrixIndex][i+1];
          //  console.log(thisCoordString+', '+thisArrayString);
          if(thisCoordString.length==0){ continue; }
          thisValueSize = Math.floor((thisArrayString.length)/(thisCoordString.length));
          /*
          console.log(thisCoordString);
          console.log(thisArrayString);
          console.log(thisCoordString.length);
          console.log(thisArrayString.length);
          */
          //  console.log('subMatrixType'+subMatrixType+' size '+thisValueSize+' for i='+i+', index='+thisIndex);

          for(j=0; j<thisCoordString.length; j++){
            thisByte = thisCoordString[j].charCodeAt();
            if(thisByte == 60){ thisByte = 92; }
            thisByte -= 64;
            thisXindex = subMatrixXbaseCoordinate+Math.floor((thisByte+(thisIndex*64))%subMatrixXlength);
            thisYindex = subMatrixYbaseCoordinate+Math.floor((thisByte+(thisIndex*64))/subMatrixXlength);
            //  console.log(subMatrixXbaseCoordinate+','+subMatrixYbaseCoordinate);
            //  console.log(Math.floor((thisByte+(thisIndex*64))%subMatrixXlength));
            //  console.log(Math.floor((thisByte+(thisIndex*64))/subMatrixXlength));

            thisValueString = thisArrayString.substr(j*thisValueSize,thisValueSize);
            thisValue = 0;
            thisShift=0;
            for(x=thisValueString.length-1; x>=0; x--){
              thisByte = thisValueString[x].charCodeAt();
              if(thisByte == 60){ thisByte = 92; }
              thisByte -= 64;
              thisValue = thisValue | (thisByte << (thisShift * 6));
              thisShift++;
            }

            repack2[thisYindex][thisXindex] = thisValue;
            if(symmeterize){ repack2[thisXindex][thisYindex] = thisValue; }
            if(thisValue>matrixMaxValue){ matrixMaxValue = thisValue; } // Update the max Z value
            if(generateColorMap){
              dataStore.hm.addPointToColorMap(objectIndex,thisYindex,thisXindex,thisValue); // Add this point to the color Map
              if(symmeterize){ dataStore.hm.addPointToColorMap(objectIndex,thisXindex,thisYindex,thisValue);
              }
            }
          }
        }
        break;
        default:
        // code block
        // Unrecognized format
        console.log('Unrecognized integer format!!!');
        console.log(raw2[subMatrixIndex]);
      } // end of switch
    }else{

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

            repack2[thisYindex][thisXindex] = thisValue;
            if(symmeterize){ repack2[thisXindex][thisYindex] = thisValue; }
            if(thisValue>matrixMaxValue){ matrixMaxValue = thisValue; } // Update the max Z value
            if(generateColorMap){
              dataStore.hm.addPointToColorMap(objectIndex,thisYindex,thisXindex,thisValue); // Add this point to the color Map
              if(symmeterize){ dataStore.hm.addPointToColorMap(objectIndex,thisXindex,thisYindex,thisValue);
              }
            }
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

          repack2[thisYindex][thisXindex] = thisValue;
          if(symmeterize){ repack2[thisXindex][thisYindex] = thisValue; }
          if(thisValue>matrixMaxValue){ matrixMaxValue = thisValue; } // Update the max Z value
          if(generateColorMap){
            dataStore.hm.addPointToColorMap(objectIndex,thisYindex,thisXindex,thisValue); // Add this point to the color Map
            if(symmeterize){ dataStore.hm.addPointToColorMap(objectIndex,thisXindex,thisYindex,thisValue);
            }
          }
        }
        break;
        default:
        // code block
        // Unrecognized format
        console.log('Unrecognized format!!!');
        console.log(raw2[subMatrixIndex]);
      } // end of switch
    } // end of if else of isInteger(submatrix type)
  } // end of submatrices for loop
  //  console.log('Finshed unpacking');
  //  console.log(repack);
  //  console.log(repack2);

  // Remove channel zero noise and junk
  /*
  for(i=0; i<nRows; i++){
  repack2[i][0] = 0;
}
for(i=0; i<rowLength-1; i++){
repack2[0][i] = 0;
}
*/

if(generateColorMap){
  // set the zmax value for this matrix
  dataStore.hm.zminfull = 0;
  dataStore.hm.zmaxfull = matrixMaxValue;

  // save this colorMap to the colorMapFull for subsequent fast redraws
  dataStore.hm.colorMap[objectIndex].fulldata = dataStore.hm.colorMap[objectIndex].data;
}

// return the correctly formatted data
return repack2;
}

function zeroSuppressData(fullData){
  // Return an object with only the non-zero bins included
  // Returned object is suitable for use with https://bkatiemills.github.io/glslgraph/demo.html/scripts/heatmap.js
  let data = {
    xBins: fullData[0].length,
    yBins: fullData.length,
    x: [],
    y: [],
    z: []
  };
  for(var i=0; i<fullData.length; i++){
    for(var j=0; j<fullData[i].length; j++){
      if(fullData[i][j]>0){
        data.x.push(j);
        data.y.push(i);
        data.z.push(fullData[i][j]);
      }
    }
  }
  return(data);
}

function trimMatrix(data,minCount){
  // Function will receive a matrix and return an array with the trailing low-count channels removed.
  // The length of each array will be reduced. Not all original row will be present.
  console.log("trimMatrix min="+minCount+", data length = "+data.length);
  var i;
  for(i=0; i<data.length; i++){
    // Remove trailing zero counts from row
    while(data[i][data[i].length-1] <minCount){ // While the last element is less than minCount
      data[i].pop();                  // Remove that last element
    }
  }

  console.log("trimMatrix after processing data length = "+data.length);
  console.log(data);

  // Remove trailing rows that are all zeros
  i=data.length-1;
  while(data[i].length<1){
    if(i<2){ return data; }
    data.pop();
    i--;
  }

  return data;
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

/////////////////////////
// Drop-area functions
/////////////////////////

function preventDropDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}

function highlightDrop(e) {
  document.getElementById('drop-area').classList.add('highlight')
}

function unhighlightDrop(e) {
  document.getElementById('drop-area').classList.remove('highlight')
}

function handleDrop(e) {
  let dt = e.dataTransfer
  let files = dt.files

  console.log(dt);
  console.log(files);

  handleDropFiles(files)
}

function handleDropFiles(files) {
  ([...files]).forEach(processDropFile)
}

function setupDropArea(){
  // Set up event listeners for the drop area
  let dropArea = document.getElementById('drop-area');
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDropDefaults, false)
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlightDrop, false)
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlightDrop, false)
  });

  dropArea.addEventListener('drop', handleDrop, false)
}


function processDropFile(file){

  // Set the title for the uploaded file
  document.getElementById('dropAreaTitleDiv').innerHTML = "Uploaded: \""+file.name+"\"";

  let fr = new FileReader();

  fr.onload = function(){
    console.log(fr.result);

    // Check the format is good json

    // Pass the script contents to the receive function
    receiveScript(fr.result);
    return;

    // Reformat the string for display with html
    let string = fr.result.replace(/(?:\r\n|\r|\n)/g, '<br>');

    // Display the whole contents in the Div
    //document.getElementById('fileContentsDiv').innerHTML = string;

    // Split the Cal file into the different entries
    var arrStr = fr.result.split(/[{}]/);

    // Remove any extra lines; comments etc
    for(var i=0; i<arrStr.length; i++){
      if(!arrStr[i].includes("Name")){
        arrStr.splice(i, 1);
      }
    }
    //console.log(arrStr);

  }

  fr.readAsText(file);
}

////////////////////////////

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

// Returns the typical peak width for a given Energy
// The result is used to set the expectation of peak fitting or gating
function typicalPeakWidth(energy,detector){
  if(energy<5){ return(1); }
  if(detector == undefined){ detector = "HPGe"; }
  let width = 1.0;

  if(detector == "HPGe"){
    width = parseFloat(energy)*0.0014 + 2.2;
  }
  if(detector == "LaBr3"){
    width = parseFloat(energy)*0.0187 + 11.247;
  }
  if(detector == "ARIES"){
    width = 15;
  }
  if(detector == "RCMP"){
    width = 40;
  }
  if(detector == "TAC"){
    width = 80;
  }
  if(width<1.0){ return(1); }
  return(width);
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

// Perform a polynomial regression with a least squares estimator
function efficiencyRegression(dataX,dataY) {

  console.log('efficiencyRegression');
  console.log(dataX);
  console.log(dataY);
  var params = [];

  // Set everything to zero to begin
  var sum_xy = 0.0, sum_x = 0.0, sum_y = 0.0, sum_x2 = 0.0, num = 0;

  // Loop over all data
  for (var i = 0; i < dataX.length; i++) {
    var x = dataX[i];
    var y = dataY[i];
    if (isNaN(y) || y === null || y === undefined) continue;

    // calculate the least squares
    num++;
    sum_x += x;
    sum_y += y;
    sum_xy += x * y;
    sum_x2 += x * x;
  }

  // calculate the parameters
  var a = (sum_xy - sum_x * sum_y / num) / (sum_x2 - sum_x * sum_x / num);
  var b = (sum_y - a * sum_x) / num;

  params = [b, a];
  if (typeof(console) != 'undefined') {
    console.log("params: [" + b + ", " + a + "]");
  }

  return(params);
};

// Perform a regression with a least squares estimator for a Normalization factor
function angularCorrelationRegression(dataX,dataY) {
  // dataY series will be normalized to dataX series
  var params = [];

  // Set everything to zero to begin
  var sum_xy = 0.0, sum_x = 0.0, sum_y = 0.0, sum_x2 = 0.0, num = 0;
  var max = 0, min=1000000;

  // clense the arrays of NaN and find min and max values
  for(var i=0; i<dataX.length; i++){
    if(isNaN(dataX[i]) || dataX[i]<0 || isNaN(dataY[i])){
      dataX.splice(i, 1);
      dataY.splice(i, 1);
    }
    if(dataX[i]<min){ min = dataX[i]; }
    if(dataX[i]>max){ max = dataX[i]; }
  }

  //  var min = Math.min(dataX);
  //  var max = Math.max(dataX);
  var range = max-min;


  // Loop over all data
  for (var i = 0; i < dataX.length; i++) {
    var x = dataX[i];
    var y = dataY[i];
    if (isNaN(x) || x === null || x === undefined) continue;
    if (isNaN(y) || y === null || y === undefined) continue;

    // calculate the least squares
    num++;
    sum_x += x;
    sum_y += y;
    sum_xy += x * y;
    sum_x2 += x * x;

    // Find the min and Max values
  }

  // calculate the parameters
  var b = (sum_y / sum_x);

  return(b);
};

// Calculate the chi-squared between two series. First series is data, second series is model.
function calculateChiSquare(dataExp,uncertExp,dataModel) {
  var chiSquare = 0;

  for(var i=0; i<dataExp.length; i++){
    if(isNaN(dataExp[i]) || dataExp[i]<0  || uncertExp[i]<0 || isNaN(dataModel[i])|| isNaN(uncertExp[i])){ continue; } // ignore NaN and empty channels
    var one = (dataExp[i]-dataModel[i]);
    var two = (dataExp[i]-dataModel[i]);
    var three = (uncertExp[i] * uncertExp[i]);
    if(isNaN(one) || isNaN(two)|| isNaN(three) || three==0){ continue; } // ignore NaN

    chiSquare += (one * two) / three;
  }

  return(chiSquare);
};

// Perform a polynomial regression with a weighted least squares estimator
function efficiencyWeightedRegression(dataX,dataY,thisYerror) {

  console.log('efficiencyRegression');
  console.log(dataX);
  console.log(dataY);
  console.log(dataYerror);
  var params = [];

  // Set everything to zero to begin
  var sum_xy = 0.0, sum_x = 0.0, sum_y = 0.0, sum_x2 = 0.0, num = 0;

  // Loop over all data
  for (var i = 0; i < dataX.length; i++) {
    var x = dataX[i];
    var y = dataY[i];
    var w = 1.0/dataYerror[i];
    if (isNaN(y) || y === null || y === undefined) continue;

    // calculate the sums, residuals and squared residuals
    num++;
    sum_x += x;
    sum_y += y;
    sum_xy += x * y;
    sum_x2 += x * x;
  }

  // calculate the parameters
  var a = (sum_xy - sum_x * sum_y / num) / (sum_x2 - sum_x * sum_x / num);
  var b = (sum_y - a * sum_x) / num;

  params = [b, a];
  if (typeof(console) != 'undefined') {
    console.log("params: [" + b + ", " + a + "]");
  }

  return(params);
};


// Legendre Polynomials
function P0(x){
  return parseFloat(1);
}
// Legendre Polynomials
function P1(x){
  return parseFloat(x);
}
// Legendre Polynomials
//The following is a general function that returns the value of the Legendre Polynomial for any given x and n=0,1,2,3,...
function Pn(x, n){
  if(n==0){
    return P0(x);
  }else if(n==1){
    return P1(x);
  }else{
    return parseFloat((2*n-1)*x*Pn(x,n-1)-(n-1)*Pn(x,n-2))/n;
  }
}

function theoreticalAngularCorrelation(c2,c4, xValues) {
  // Given the c2 and c4 coefficients, return the series of y values of the angular correlation for the given x series.
  // x values expected in radians between -1 and 1
  if(xValues.Min<-1 || xValues.Max>1){
    console.log("Function theoreticalAngularCorrelation() expects the x values to be in radians between -1 and 1.");
    return;
  }

  var series = [];
  for(i=0; i<xValues.length; i++){
    series.push((1.0 + (c2*Pn(xValues[i],2)) + (c4*Pn(xValues[i],4))));
  }
  return(series);
}
