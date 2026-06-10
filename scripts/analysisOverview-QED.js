
// Function to setup the QED widget if QED data is present in this histogram file
function setupQEDplots(){
  console.log("setupQEDplots...");
  console.log(dataStore);

  // Bail out if there are no QED plots
  if(dataStore.detTypesData["QED"].activeChans<10){
    document.getElementById('widget-qed').classList.add('hidden'); // hide the QED widget
    return; // cleanly exit
  }

  // Set up the plot menu
  // Create a select input for the choice of spectrum data
  var newSelect = document.createElement("select");
  newSelect.id = 'QEDMenuSelect';
  newSelect.name = 'QEDMenuSelect';
  newSelect.onchange = function(){
    dataStore.QEDhistoName = dataStore.histoFileName.split(".")[0] + ":" + this.value;
    createQEDplotly(dataStore.QEDparentDiv, dataStore.QEDhistoName, dataStore.QEDtitle);
  }.bind(newSelect);
  document.getElementById('widget-qed-menu').appendChild(newSelect);

  // Add the list of spectra as the options of the select
  thisSelect = document.getElementById('QEDMenuSelect');
  for(var i=0; i<dataStore.QEDanalysisSpectrumList.length; i++){
    thisSelect.add( new Option(dataStore.QEDanalysisSpectrumList[i], dataStore.QEDanalysisSpectrumList[i]) );
  }
  // Add the list of spectra as the options of the select - with normalization
  thisSelect = document.getElementById('QEDMenuSelect');
  for(var i=0; i<dataStore.QEDanalysisSpectrumList.length; i++){
    thisSelect.add( new Option(dataStore.QEDanalysisSpectrumList[i]+"_normalized", dataStore.QEDanalysisSpectrumList[i]+"_normalized") );
  }
  thisSelect.value = "QED_DCS_azimuth2_70_110"; // default selection for initial draw

    // Set up the options menu
    // Create a select input for the choice of spectrum data
    var newSelect = document.createElement("select");
    newSelect.id = 'QEDOptionsSelect';
    newSelect.name = 'QEDOptionsSelect';
    newSelect.onchange = function(){
      dataStore.QEDhistoExcludeBins = Boolean(this.value);
      createQEDplotly(dataStore.QEDparentDiv, dataStore.QEDhistoName, dataStore.QEDtitle);
    }.bind(newSelect);
    document.getElementById('widget-qed-menu').appendChild(newSelect);

    // Add the list of spectra as the options of the select
    thisSelect = document.getElementById('QEDOptionsSelect');
    thisSelect.add( new Option("Show all bins", 0) );
    thisSelect.add( new Option("Exclude bins within 10 degrees of 0 or 180", 1) );
    thisSelect.value = 0; // default selection for initial draw
    dataStore.QEDhistoExcludeBins = Boolean(0);  // default selection for initial draw

  // Define the target div for the Plotly graph
  dataStore.QEDparentDiv = 'widget-qed-plotly'; // defined in analysisOverview.html file

  // Define the spectrum to be used for the data of this plot
  dataStore.QEDhistoName = dataStore.histoFileName.split(".")[0] + ":" + "QED_DCS_azimuth2_70_110";

  // Define the title to be displayed at the top of the plot
  dataStore.QEDtitle = 'QED azimuthal';

  // Initial draw on start up
  // Call the function that will create the Plotly graph with the information given
  createQEDplotly(dataStore.QEDparentDiv, dataStore.QEDhistoName, dataStore.QEDtitle);
}

// Function to create the formatting and data for the Plotly graph
function createQEDplotly(targetDiv, dataKey, title){
  // re-create the specified histogram
  var applyNormalization = false;

  // Define the layout object that controls the appearance
  var layout = {
    height: 600, // height in pixels
    width: 800,
    margin:{ t:40,r:50,b:50,l:50,pad:4},
    title: title,
    plot_bgcolor: "#222222",
    paper_bgcolor: "#222222",
    range: [-180, 180]
  };

  // Is there a request for normalization?
  if(dataKey.includes("_normalized")){
    applyNormalization = true;
    dataKey = dataKey.split("_normalized")[0];
  }

  // Define the data and labels for the x axis
  var bins = [];
  var labels = [];
  for(var i=-180; i<=180; i++){
    bins.push(i);
  }

  // Define the data for the y axis
  var data=[];
  data = dataStore.rawData[dataKey].slice(0,361);

  // Define the errors as the sqrt of the data points
  var errorData=[];
  for(var i=0; i<bins.length; i++){
    errorData.push(parseFloat((Math.sqrt(data[i])).toFixed(1)));
  }

  // Apply Normalization here
  if(applyNormalization){
    var data = performNormalization(data, dataKey.split(":")[1]);
    //  console.log(data); // print the data array to the console

    var errorData = calculateNormalizedUncertainties(dataStore.rawData[dataKey],errorData,data,dataKey.split(":")[1]);
  }

// Exclude bins if this option is selected
if(dataStore.QEDhistoExcludeBins){
bins.splice(351,10);
data.splice(351,10);
errorData.splice(351,10);
bins.splice(171,19);
data.splice(171,19);
errorData.splice(171,19);
bins.splice(0,10);
data.splice(0,10);
errorData.splice(0,10);
console.log(bins);
console.log(data);
console.log(errorData);
console.log("Did it work?");
console.log(dataStore);
}

  // Determine the theoretical best fit line
  // First build the basic cos(2 deltaPhi) series to be fitted to the data
  var lineData = [];
  for(var i=0; i<bins.length; i++){
    lineData[i] = Math.cos(2.0*bins[i]*(3.14159/180));
  }
  var params = [];
  // Use a linear regression to determine the two parameters (this function is in helpers.js)
  params = efficiencyRegression(lineData,data);

  // Recalculate the datapoints for the best fit line to be used in the plot
  for(var i=0; i<bins.length; i++){
    lineData[i] = params[1]*Math.cos(2.0*bins[i]*(3.14159/180))+params[0];
  }

  // Calculate the enhancement factor, R
  var enhancement = ((params[0]-params[1])/(params[0]+params[1])).toFixed(2);

  // Find the uncertainty in the fit to the data - the standard error
  var sumSqDeviations = 0;
  for(var i=0; i<bins.length; i++){
    if(isNaN(data[i])){ continue; }
    sumSqDeviations += (data[i] - lineData[i])*(data[i] - lineData[i]);
  }
  var fitStandardError = Math.sqrt(sumSqDeviations/(bins.length-2));
  // https://www.itl.nist.gov/div898/handbook/eda/section3/eda3674.htm
  // For a 95% confidence interval with 358 degrees of freedom
  var criticalValue = 1.967;
  var enhancementUncert = (fitStandardError * criticalValue).toFixed(2);

// Calculate the reduced chi-square of the fit to the data (function in helpers.js)
//var reducedChiSq = (RCS(data, lineData, 2)).toFixed(2);

  // Report the fit parameters in the Div
  document.getElementById('widget-qed-reportDiv').innerHTML = "<big>Enhancement factor, R="+enhancement+"&plusmn;"+enhancementUncert+"</big>";
  //+ "<br>Reduced chi-square = "+reducedChiSq;

  // Package the data objects together for consumption by Plotly
  // scatter type plot with only datapoint markers shown
  var plotData = [];

  plotData[0] = { // The data points
    x: bins,
    y: data,
    name: dataKey,

    error_y: {
      type: 'data',
      array: errorData, // Specific error values for each point
      visible: true
    },

    mode: 'markers',
    type: 'scatter'
  };

  plotData[1] = { // The line of best fit
    x: bins,
    y: lineData,
    name: "cos(2 delta Phi) + Mean",
    mode: 'line'
  };

  // Create the Plotly plot using the information defined above in this is function
  Plotly.newPlot(targetDiv, plotData, layout, {displayModeBar: false});
}

function performNormalization(raw,weightsKey){
  // Declare array variables
  var normalized = [], weight = [];

  // Get the raw number of detector pairs distribution from the data store using the key provided
  var rawWeights = dataStore.QEDAzimuthalWeightingFactors[weightsKey];

  // Find the sum of the data values and the sum of the weights values
  var dataSum = raw.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  var weightSum = rawWeights.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

  // Calculate the weighting factor for each bin from the raw number of detector pairs and total weights sum
  for(var i=0; i<rawWeights.length; i++){
    weight[i] = rawWeights[i] / weightSum;
  }

  // Normalize the data using the weighting factors and total data dum
  for(i=0; i<raw.length; i++){
    normalized[i] = raw[i] / (weight[i] * dataSum);
  }

  // Return the normalized data series
  return(normalized);
}

function calculateNormalizedUncertainties(data,errorData,normalized,weightsKey){
  var uncertainties = [];

  // Get the raw number of detector pairs distribution from the data store using the key provided
  var rawWeights = dataStore.QEDAzimuthalWeightingFactors[weightsKey];

  // Find the sum of the data values and the sum of the weights values
  var dataSum = data.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  var weightSum = rawWeights.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

  // Find the fractuional uncertainty for the summed values
  var dataFractionalError = Math.pow(Math.sqrt(dataSum)/dataSum,2)
  var weightFractionalError = Math.pow(Math.sqrt(weightSum)/weightSum,2)

  // Add the fractional errors in quadrature for each bin
  for(var i=0; i<data.length; i++){
    uncertainties[i] = normalized[i] * Math.sqrt( Math.pow(errorData[i]/data[i],2) + Math.pow(Math.sqrt(rawWeights[i])/rawWeights[i],2) + dataFractionalError + weightFractionalError);
  }

  // Return the series of uncertainties for the normalized data
  return(uncertainties);
}
