////////////////////////////
// Analyzer Interface Viewer setup
////////////////////////////

function setupCalibrationsContent(){
  // function to refresh the content of the Calibrations subpage
  // Called when there is new content available
  //console.log('setupCalibrationsContent');

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

  // Populate the Config table on initial load
  refreshConfigCalibrationsContent();
}

function refreshConfigCalibrationsContent(){
  //console.log(dataStore.currentCalibrations);

  // Set the title for the current config
  thisTimestamp = new Date(dataStore.configFileTimestamp * 1000);
  document.getElementById('currentConfigCalibrationsTitleDiv').innerHTML = "<h3>Current Config file</h3>"+
  "<br>Fetched "+thisTimestamp.toString();
  // Clear the report Div
  document.getElementById('currentConfigCalibrationsTableDiv').innerHTML = "";

  // Insert the Table and headers
  var table = document.createElement('table');
  table.id = "ConfigCalibrationsTable";
  table.setAttribute('class','calibrationTable');
  var row = table.insertRow(0);
  row.id = "ConfigCalibrationsTable-HeaderRow";
  row.setAttribute('class','calibrationsRow');
  var cell1 = row.insertCell(0);
  var cell2 = row.insertCell(1);
  var cell3 = row.insertCell(2);
  var cell4 = row.insertCell(3);

  cell1.setAttribute('class','calibrationsCell');
  cell2.setAttribute('class','calibrationsCell');
  cell3.setAttribute('class','calibrationsCell');
  cell4.setAttribute('class','calibrationsCell');
  cell1.innerHTML = "Name";
  cell2.innerHTML = "Quad";
  cell3.innerHTML = "Gain";
  cell4.innerHTML = "Offset";

  document.getElementById('currentConfigCalibrationsTableDiv').appendChild(table);


  let outputString = "";
  for(let i=0; i<dataStore.currentCalibrations.length; i++){
    //  outputString += dataStore.currentCalibrations[i].name+': '+ dataStore.currentCalibrations[i].quad+','
    //  + dataStore.currentCalibrations[i].gain+','+ dataStore.currentCalibrations[i].offset + "<br>";

    row = table.insertRow(-1);
    row.id = "ConfigCalibrationsTable-Row-"+dataStore.currentCalibrations[i].name;
    row.setAttribute('class','calibrationsRow');
    cell1 = row.insertCell(0);
    cell2 = row.insertCell(1);
    cell3 = row.insertCell(2);
    cell4 = row.insertCell(3);
    cell1.innerHTML = dataStore.currentCalibrations[i].name;
    cell2.innerHTML = dataStore.currentCalibrations[i].quad;
    cell3.innerHTML = dataStore.currentCalibrations[i].gain;
    cell4.innerHTML = dataStore.currentCalibrations[i].offset;
    cell5 = row.insertCell(4);
    cell6 = row.insertCell(5);
    cell7 = row.insertCell(6);
    cell8 = row.insertCell(7);
    cell5.setAttribute('class','calibrationsCell');
    cell6.setAttribute('class','calibrationsCell');
    cell7.setAttribute('class','calibrationsCell');
    cell8.setAttribute('class','calibrationsCell');
    cell5.id = "ConfigCalibrationsTable-Cell-"+dataStore.currentCalibrations[i].name+"-quad";
    cell6.id = "ConfigCalibrationsTable-Cell-"+dataStore.currentCalibrations[i].name+"-gain";
    cell7.id = "ConfigCalibrationsTable-Cell-"+dataStore.currentCalibrations[i].name+"-offset";
    cell8.id = "ConfigCalibrationsTable-Cell-"+dataStore.currentCalibrations[i].name+"-TSoffset";
  }

  //  document.getElementById('currentConfigCalibrationsTableDiv').innerHTML = outputString;

  // Add the Cal file contents to the Table
  refreshConfigCalibrationsTableWithCalFile();
}


/////////////////
// helpers
/////////////////

function sendCalibrationsToAnalyzer(){

  //send requests
  for(let i=0; i<dataStore.CalibrationURLs.length; i++){
    XHR(dataStore.CalibrationURLs[i], 'An error occured.',
    function(){ document.getElementById('submitDivCalReport').innerHTML = "This calibration has been uploaded to the Analyzer. It is now the Current Config file."; return 0},
    function(error){console.log(error); document.getElementById('submitDivCalReport').innerHTML = "An error occured.";} );
  }

}

function toggleODBwrite(){
  //toggle odb writing permission (in the modal)

  var allowed = document.getElementById('yesDefinitelyWriteODB').checked

  if(allowed)
  document.getElementById('writeToODB').removeAttribute('disabled');
  else
  document.getElementById('writeToODB').setAttribute('disabled', true);
}

function processDropFile(file){

  // Clear the report Div
  document.getElementById('submitDivCalReport').innerHTML = "";

  // Set the title
  document.getElementById('calFileContentsTitleDiv').innerHTML = "<h3>Contents of Cal file</h3><br>\""+file.name+"\"";
  //    +"", "+(file.size/1000).toFixed(1)+" kB,<br>last modified "+file.lastModifiedDate+"<br>";

  let fr = new FileReader();

  fr.onload = function(){
    //  console.log(fr.result);

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

    // Update the table header row
    var row = document.getElementById("ConfigCalibrationsTable-HeaderRow");
    if(row.cells.length<8){
      cell5 = row.insertCell(4);
      cell6 = row.insertCell(5);
      cell7 = row.insertCell(6);
      cell8 = row.insertCell(7);
      cell5.innerHTML = "Quad";
      cell6.innerHTML = "Gain";
      cell7.innerHTML = "Offset";
      cell8.innerHTML = "TS Offset";
    }

    // Build URLs for sending to the Analyzer
    var num=0, ctr=0, ctr2=0;
    var spectrumServer = dataStore.spectrumServer;
    dataStore.CalibrationURLs = []; // Reset the URLs
    globalsURLs = [];
    pileupURLs = [];
    crosstalkURLs = [];
    dataStore.CalibrationURLs[num] = spectrumServer + '?cmd=setCalibration';
    let outputString = "";
    dataStore.dropFileCalibrations = {};
    // First build all Calibrations from the usual cal file entries
    for(var i=0; i<arrStr.length; i++){
      var thisGlobalName = ""; // Clear this at the start of each new entry
      var thisTSOffset = ""; // Clear this at the start of each new entry
      var thisPileupk1 = []; // Clear this at the start of each new entry
      var thisPileupk2 = []; // Clear this at the start of each new entry
      var thisPileupE1 = []; // Clear this at the start of each new entry
      var thisCrosstalk0 = []; // Clear this at the start of each new entry
      var thisCrosstalk1 = []; // Clear this at the start of each new entry
      var thisCrosstalk2 = []; // Clear this at the start of each new entry
      // Split one entry into its parts
      thisArrStr = arrStr[i].split('\n');
      for(var j=0; j<thisArrStr.length; j++){
        if(thisArrStr[j].includes("Name")){
          //thisName = thisArrStr[j].split(/\t| /)[1];
          thisName = thisArrStr[j].split(":")[1].trim();
        }
        if(thisArrStr[j].includes("EngCoeff") || thisArrStr[j].includes("ENGCoeff")){
          thisArray = thisArrStr[j].split(/\t| /);
          thisArray = thisArray.filter(String);
          thisOffset = parseFloat(thisArray[1]);
          thisGain = parseFloat(thisArray[2]);
          thisQuad = parseFloat(thisArray[3]);
          //  console.log("Using thisArray: "+thisName+': '+ thisQuad+','+ thisGain+','+ thisOffset);
        }
        if(thisArrStr[j].includes("pileupk1")){
          thisArray = thisArrStr[j].split(/\t| /);
          thisArray = thisArray.filter(String);
          for(var k=0; k<7; k++){ thisPileupk1.push(parseFloat(thisArray[k+1])); }
        }
        if(thisArrStr[j].includes("pileupk2")){
          thisArray = thisArrStr[j].split(/\t| /);
          thisArray = thisArray.filter(String);
          for(var k=0; k<7; k++){ thisPileupk2.push(parseFloat(thisArray[k+1])); }
        }
        if(thisArrStr[j].includes("pileupE1")){
          thisArray = thisArrStr[j].split(/\t| /);
          thisArray = thisArray.filter(String);
          for(var k=0; k<7; k++){ thisPileupE1.push(parseFloat(thisArray[k+1])); }
        }
        if(thisArrStr[j].includes("crosstalk0")){
          thisArray = thisArrStr[j].split(/\t| /);
          thisArray = thisArray.filter(String);
          for(var k=0; k<16; k++){ thisCrosstalk0.push(parseFloat(thisArray[k+1])); }
        }
        if(thisArrStr[j].includes("crosstalk1")){
          thisArray = thisArrStr[j].split(/\t| /);
          thisArray = thisArray.filter(String);
          for(var k=0; k<16; k++){ thisCrosstalk1.push(parseFloat(thisArray[k+1])); }
        }
        if(thisArrStr[j].includes("crosstalk2")){
          thisArray = thisArrStr[j].split(/\t| /);
          thisArray = thisArray.filter(String);
          for(var k=0; k<16; k++){ thisCrosstalk2.push(parseFloat(thisArray[k+1])); }
        }
        if(thisArrStr[j].includes("TimeOffset") && thisName.includes("LBT")){
          // This is a LBT/TAC timestamp offset which will be added as a Global not a Calibration
          // http://localhost:9093/?cmd=addGlobal&globalname=TAC-Offset-01-04&globalmin=-100&globalmax=-731
          thisArray = thisArrStr[j].split(/\t| /);
          thisArray = thisArray.filter(String);
          var thisTSOffset = parseFloat(thisArray[1]);
          var thisNum = thisName.split("LBT")[1].split("X")[0];
          var thisGlobalName = "Timestamp-offset-LBT" + alwaysThisLong(parseInt(thisNum),2);
          var thisURLString = spectrumServer + '?cmd=addGlobal&globalname=' + thisGlobalName + "&globalmin=0&globalmax=" + thisTSOffset;
          globalsURLs.push(thisURLString);
          outputString += thisName+': '+ thisGlobalName+','+ thisTSOffset + "<br>";
        }
      }
      if(thisName.includes("TAC_") && !isNaN(thisOffset)){
        // This is a TAC Offset which will be added as a Global not a Calibration
        // http://localhost:9093/?cmd=addGlobal&globalname=TAC-Offset-01-04&globalmin=-100&globalmax=-731
        var thisGlobalName = "TAC-Offset-" + alwaysThisLong(parseInt(thisGain),2) + "-" + alwaysThisLong(parseInt(thisQuad),2);
        var thisURLString = spectrumServer + '?cmd=addGlobal&globalname=' + thisGlobalName + "&globalmin=0&globalmax=" + thisOffset;
        globalsURLs.push(thisURLString);
        outputString += thisName+': '+ thisGlobalName+','+ thisOffset + "<br>";
        // Save this entry to the dataStore object
        if(!dataStore.dropFileCalibrations.thisName){ dataStore.dropFileCalibrations[thisName] = { 'name':"", 'quad':0,'gain':1,'offset':0 }; }
        dataStore.dropFileCalibrations[thisName].name = thisName;
        dataStore.dropFileCalibrations[thisName].quad = thisGlobalName;
        dataStore.dropFileCalibrations[thisName].gain = thisOffset;
        dataStore.dropFileCalibrations[thisName].offset = "";
        dataStore.dropFileCalibrations[thisName].TSoffset = "";
        continue;
      }
      //  console.log(thisName+': '+ thisQuad+','+ thisGain+','+ thisOffset);
      outputString += thisName+': '+ thisQuad+','+ thisGain+','+ thisOffset + "<br>";

      // Build main calibration URL here
      // Dont allow NaN to be sent to the server
      if(isNaN(thisQuad)){ thisQuad = 0.0; }
      if(isNaN(thisGain)){ thisGain = 1.0; }
      if(isNaN(thisOffset)){ thisOffset = 0.0; }
      dataStore.CalibrationURLs[num] += '&channelName'+ctr+'='+thisName+'&quad'+ctr+'='+thisQuad+'&gain'+ctr+'='+thisGain+'&offset'+ctr+'='+thisOffset;
      ctr++;
      if(ctr%12==0){ // new URL every 12 entries
        num++; ctr=0;
        dataStore.CalibrationURLs[num] = spectrumServer + '?cmd=setCalibration';
      }

      // Build the pileup URLs if pileup coefficients are present
      // One URL per channel as it is three arrays of six parameters
      if(thisPileupk1.length>0){
        var thisURLString = spectrumServer + '?cmd=setPileupCorrection&channelName0=' + thisName;
        thisURLString += "&pileupk10=";
        for(var k=0; k<7; k++){ if(k>0){ thisURLString += ","; } thisURLString += thisPileupk1[k]; }
        thisURLString += "&pileupk20=";
        for(var k=0; k<7; k++){ if(k>0){ thisURLString += ","; } thisURLString += thisPileupk2[k]; }
        thisURLString += "&pileupE10=";
        for(var k=0; k<7; k++){ if(k>0){ thisURLString += ","; } thisURLString += thisPileupE1[k]; }
        pileupURLs.push(thisURLString);
      }

      // Build the crosstalk URLs if crosstalk coefficients are present
      // One URL per channel as it is three arrays of six parameters
      if(thisCrosstalk0.length>0){
        var thisURLString = spectrumServer + '?cmd=setCrosstalkCorrection&channelName0=' + thisName;
        thisURLString += "&crosstalk0=";
        for(var k=0; k<16; k++){ if(k>0){ thisURLString += ","; } thisURLString += thisCrosstalk0[k]; }
        thisURLString += "&crosstalk1=";
        for(var k=0; k<16; k++){ if(k>0){ thisURLString += ","; } thisURLString += thisCrosstalk1[k]; }
        thisURLString += "&crosstalk2=";
        for(var k=0; k<16; k++){ if(k>0){ thisURLString += ","; } thisURLString += thisCrosstalk2[k]; }
        crosstalkURLs.push(thisURLString);
      }

      // Save this entry to the dataStore object
      if(!dataStore.dropFileCalibrations.thisName){ dataStore.dropFileCalibrations[thisName] = { 'name':"", 'quad':0,'gain':1,'offset':0,'TSoffset':"",'pileupk1':[],'pileupk2':[],'pileupE1':[] }; }
      dataStore.dropFileCalibrations[thisName].name = thisName;
      dataStore.dropFileCalibrations[thisName].quad = thisQuad;
      dataStore.dropFileCalibrations[thisName].gain = thisGain;
      dataStore.dropFileCalibrations[thisName].offset = thisOffset;
      dataStore.dropFileCalibrations[thisName].TSoffset = thisTSOffset;
      dataStore.dropFileCalibrations[thisName].pileupk1 = thisPileupk1;
      dataStore.dropFileCalibrations[thisName].pileupk2 = thisPileupk2;
      dataStore.dropFileCalibrations[thisName].pileupE1 = thisPileupE1;

    }

    // Add any Globals to the end of the dataStore.CalibrationURLs list
    for(i=0; i<globalsURLs.length; i++){
      dataStore.CalibrationURLs.push(globalsURLs[i]);
    }

    // Add any Pileup URLs to the end of the dataStore.CalibrationURLs list
    for(i=0; i<pileupURLs.length; i++){
      dataStore.CalibrationURLs.push(pileupURLs[i]);
    }

    // Add any Crosstalk URLs to the end of the dataStore.CalibrationURLs list
    for(i=0; i<crosstalkURLs.length; i++){
      dataStore.CalibrationURLs.push(crosstalkURLs[i]);
    }

    //  console.log(dataStore.CalibrationURLs);

    // Add the Cal file contents to the Table
    refreshConfigCalibrationsTableWithCalFile();

    // Reveal the button for sending these calibrations to the Analyzer or ODB
    document.getElementById('submitCalibrationsButton').classList.remove('hidden');
    document.getElementById('writeToODBmodalCall').classList.remove('hidden');

    // Display the gain coefficients in the Div
    //document.getElementById('calFileContentsDiv').innerHTML = outputString;
  }

  fr.readAsText(file);
}

function refreshConfigCalibrationsTableWithCalFile(){

  var keys = Object.keys(dataStore.dropFileCalibrations);

  for(var i=0; i<keys.length; i++){
    var thisName = keys[i];
    var thisQuad = dataStore.dropFileCalibrations[thisName].quad;
    var thisGain = dataStore.dropFileCalibrations[thisName].gain;
    var thisOffset = dataStore.dropFileCalibrations[thisName].offset;
    var thisTSOffset = dataStore.dropFileCalibrations[thisName].TSoffset;

    // Update the table for this detector
    if(document.getElementById("ConfigCalibrationsTable-Row-"+thisName) != null){
      document.getElementById("ConfigCalibrationsTable-Cell-"+thisName+"-quad").innerHTML = thisQuad;
      document.getElementById("ConfigCalibrationsTable-Cell-"+thisName+"-gain").innerHTML = thisGain;
      document.getElementById("ConfigCalibrationsTable-Cell-"+thisName+"-offset").innerHTML = thisOffset;
      document.getElementById("ConfigCalibrationsTable-Cell-"+thisName+"-TSoffset").innerHTML = thisTSOffset;
    }else{
      // thie detector name is not in the current config so add new rows to the bottom of the table
      var table = document.getElementById("ConfigCalibrationsTable");
      var row = table.insertRow(-1);
      row.id = "ConfigCalibrationsTable-Row-"+thisName;
      row.setAttribute('class','calibrationsRow');
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);
      var cell4 = row.insertCell(3);
      cell1.innerHTML = thisName;
      var cell5 = row.insertCell(4);
      var cell6 = row.insertCell(5);
      var cell7 = row.insertCell(6);
      var cell8 = row.insertCell(7);
      cell5.id = "ConfigCalibrationsTable-Cell-"+thisName+"-quad";
      cell6.id = "ConfigCalibrationsTable-Cell-"+thisName+"-gain";
      cell7.id = "ConfigCalibrationsTable-Cell-"+thisName+"-offset";
      cell8.id = "ConfigCalibrationsTable-Cell-"+thisName+"-TSoffset";
      document.getElementById("ConfigCalibrationsTable-Cell-"+thisName+"-quad").innerHTML = thisQuad;
      document.getElementById("ConfigCalibrationsTable-Cell-"+thisName+"-gain").innerHTML = thisGain;
      document.getElementById("ConfigCalibrationsTable-Cell-"+thisName+"-offset").innerHTML = thisOffset;
      document.getElementById("ConfigCalibrationsTable-Cell-"+thisName+"-TSoffset").innerHTML = thisTSOffset;
    }
  }
}
