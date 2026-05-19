
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
  thisSelect.value = "QED_DCS_azimuth2_70_110"; // default selection for initial draw
  
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

  // Define the layout object that controls the appearance
  var layout = {
    height: 600, // height in pixels
    width: 800,
    margin:{ t:40,r:50,b:50,l:50,pad:4},
    title: title,
    plot_bgcolor: "#222222",
    paper_bgcolor: "#222222",
    range: [-180, 180]   // Sets the minimum to 0, maximum is auto-calculated
  };

  // Define the data and labels for the x axis
  var bins = [];
  var labels = [];
  for(var i=-180; i<=180; i++){
    bins.push(i);
  }

  // Define the data for the y axis
  var data=[];
  data = dataStore.rawData[dataKey];

  // Define the errors as the sqrt of the data points
  var errorData=[];
  for(var i=0; i<data.length; i++){
    errorData.push((Math.sqrt(data[i])).toFixed(1));
  }

  // Package the data objects together for consumption by Plotly
  // scatter type plot with only datapoint markers shown
  var plotData = {
    x: bins,
    y: data,
    error_y: {
      type: 'data',
      array: errorData, // Specific error values for each point
      visible: true
    },
    mode: 'markers',
    type: 'scatter'
  };

  // Create the Plotly plot using the information defined above in this is function
  Plotly.newPlot(targetDiv, [plotData], layout, {displayModeBar: false});
}
