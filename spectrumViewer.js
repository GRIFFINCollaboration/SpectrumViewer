function reportSpectrumBin(){
	SVparam.canvas.addEventListener('mousemove', function(event){
		var coords, x, y, xBin, yBin;

		coords = document.getElementById(SVparam.canvasID).relMouseCoords(event);
		x = coords.x;
		y = coords.y;

        if(x > SVparam.leftMargin && x < SVparam.canvas.width - SVparam.rightMargin && y > SVparam.topMargin){
	        xBin = Math.floor((x-SVparam.leftMargin)/SVparam.binWidth) + SVparam.XaxisLimitMin;
    	    
    	    if(SVparam.AxisType == 1){
    	    	yBin = (SVparam.canvas.height-SVparam.bottomMargin - y) / SVparam.countHeight;
    	    	yBin = Math.floor(Math.pow(10,yBin)/10);
    	    } else {
    	    	yBin = Math.floor((SVparam.canvas.height-SVparam.bottomMargin - y) / SVparam.countHeight);
    	    }

        	document.getElementById('mousebox').innerHTML = 'x=' + xBin.toFixed(0) + ' y=' + yBin.toFixed(0);
        } else {
        	document.getElementById('mousebox').innerHTML = '';
        }

        //change cursor to indicate draggable region:
        if(SVparam.fitModeEngage){
        	if( y < (SVparam.canvas.height - SVparam.bottomMargin) )
	        	document.body.style.cursor = 's-resize';
	        else 
	        	document.body.style.cursor = 'n-resize';
	    }
        else if(y>SVparam.canvas.height-SVparam.bottomMargin) 
        	document.body.style.cursor = 'pointer';
        else
        	document.body.style.cursor = 'default';

	}, false);

	SVparam.canvas.onmouseout = function(event){
		document.body.style.cursor = 'default';
	};
}

function DragWindow(){
	var buffer;

	//don't even try if there's only one bin selected:
	if(SVparam.XMouseLimitxMin != SVparam.XMouseLimitxMax){
		//don't confuse the click limits with the click and drag limits:
		SVparam.clickBounds[0] = 'abort';

		//Make sure the max is actually the max:
		if(SVparam.XMouseLimitxMax < SVparam.XMouseLimitxMin){
			buffer = SVparam.XMouseLimitxMax;
			SVparam.XMouseLimitxMax = SVparam.XMouseLimitxMin;
			SVparam.XMouseLimitxMin = buffer;
		}

		//keep things in range
		if(SVparam.XMouseLimitxMin < 0) SVparam.XMouseLimitxMin = 0;
		if(SVparam.XMouseLimitxMax > SVparam.XaxisLimitAbsMax) SVparam.XMouseLimitxMax = SVparam.XaxisLimitAbsMax;

		//stick into the appropriate globals
		SVparam.XaxisLimitMin = parseInt(SVparam.XMouseLimitxMin);
		SVparam.XaxisLimitMax = parseInt(SVparam.XMouseLimitxMax);

		//populate the text fields:
		document.getElementById("LowerXLimit").value=SVparam.XaxisLimitMin;
		document.getElementById("UpperXLimit").value=SVparam.XaxisLimitMax;	
		//programatically trigger the fields' onchange:
		document.getElementById('LowerXLimit').onchange();
		document.getElementById('UpperXLimit').onchange();

		//drawXaxis();
		SVparam.YaxisLimitMax=5;

		plot_data(0);

	}
}

function ClickWindow(bin){

	//decide what to do with the clicked limits - zoom or fit?
	if(SVparam.clickBounds.length == 0){
		SVparam.clickBounds[0] = bin;
	} else if(SVparam.clickBounds[0] == 'abort' && !SVparam.fitModeEngage){
		SVparam.clickBounds = [];
	} else if(SVparam.clickBounds.length == 2 ){
		SVparam.clickBounds = [];
		SVparam.clickBounds[0] = bin;
	} else if(SVparam.clickBounds.length == 1){
		SVparam.clickBounds[1] = bin;
		//fit mode
		if(SVparam.fitModeEngage){
			SVparam.FitLimitLower = Math.min(SVparam.clickBounds[0], SVparam.clickBounds[1]);
			SVparam.FitLimitUpper = Math.max(SVparam.clickBounds[0], SVparam.clickBounds[1]);
			FitData();
		} else {  //zoom mode
			//use the mouse drag function to achieve the same effect for clicking:
			SVparam.XMouseLimitxMin = SVparam.clickBounds[0];
			SVparam.XMouseLimitxMax = SVparam.clickBounds[1];
			DragWindow();
			SVparam.clickBounds = [];
		}
	}
}

function setAxisLimit(input, fieldID, target, absMax){
	var field = document.getElementById(fieldID)
	if(field.validity.valid){

		//mins are always protected to be > 0 from the HTML, but maxs need to be babysat:
		if(field.value > SVparam[absMax])
			field.value = SVparam[absMax];

		//input the number requested...
		SVparam[target]=input;

		//...and make sure it makes sense.
		if(SVparam[target]>SVparam[absMax])
			SVparam[target]=SVparam[absMax];

		if(SVparam[target]<0) 
			SVparam[target]=0;

	} else {  //exception handling, bump the value back to whatever it used to be.
		field.value = SVparam[target];
	}
}

function scrollSpectra(step, targetMin, targetMax, targetAbsMax, loField, hiField){
	var windowSize = SVparam[targetMax] - SVparam[targetMin];

	SVparam[targetMin] += step;
	SVparam[targetMax] += step;

	if(SVparam[targetMin] < 0){
		SVparam[targetMin] = 0;
		SVparam[targetMax] = windowSize;
	}

	if(SVparam[targetMax] > SVparam[targetAbsMax]){
		SVparam[targetMax] = SVparam[targetAbsMax];
		SVparam[targetMin] = SVparam[targetAbsMax] - windowSize;
	}

	document.getElementById(loField).value = SVparam[targetMin];
	document.getElementById(loField).onchange();
	document.getElementById(hiField).value = SVparam[targetMax];
	document.getElementById(hiField).onchange();
}

function Unzoom(){

	//1D
	if(document.getElementById('LowerXLimit')){
		SVparam.XaxisLimitMin=0;
		SVparam.XaxisLimitMax=SVparam.XaxisLimitAbsMax;

		//update input field values and trigger their onchange:
		document.getElementById("LowerXLimit").value=SVparam.XaxisLimitMin;
		document.getElementById("UpperXLimit").value=SVparam.XaxisLimitMax;
		document.getElementById('LowerXLimit').onchange();
		document.getElementById('UpperXLimit').onchange();

		plot_data(0);
	}

	//2D
	if(document.getElementById('LowerXLimit2D')){
		SVparam.XaxisLimitMin2D = 0;
		SVparam.XaxisLimitMax2D = SVparam.XaxisLimitAbsMax2D;
		SVparam.YaxisLimitMin2D = 0;
		SVparam.YaxisLimitMax2D = SVparam.YaxisLimitAbsMax2D;

		document.getElementById("LowerXLimit2D").value=SVparam.XaxisLimitMin2D;
		document.getElementById("UpperXLimit2D").value=SVparam.XaxisLimitMax2D;
		document.getElementById("LowerYLimit").value=SVparam.YaxisLimitMin2D;
		document.getElementById("UpperYLimit").value=SVparam.YaxisLimitMax2D;

		plot_data2D(0);	
	}

}

/////////////////////////////////////////////////////////////////////
// set_SVparam.AxisType function                                   //
// Function to change to and from Linear and Logarithmic Y axis    //
/////////////////////////////////////////////////////////////////////
function set_AxisType(word){
	var x;

	//TODO: overkill, simplify:
	x=word.id;
	SVparam.AxisType=x.substring(1,2);
	x=x.substring(0,1)+"0"; document.getElementById(x+"").checked=false;
	x=x.substring(0,1)+"1"; document.getElementById(x+"").checked=false;
	x=word.id; document.getElementById(x+"").checked=true;
	SVparam.AxisType=word.value;

	if(SVparam.AxisType==0){
		SVparam.YaxisLimitMin=0;
		SVparam.YaxisLimitMax=500;
	}

	if(SVparam.AxisType==1){
		SVparam.YaxisLimitMin=0.1;
		SVparam.YaxisLimitMax=SVparam.YaxisLimitMax*100;  //?? okay I guess...
	}	
	plot_data(0);
}
//////////////////////////////////
// End of set_SVparam.AxisType function //
//////////////////////////////////


/////////////////////////////////////////////////////////////////////
// startup function                                                //
// Function to draw everything the first time when page is loaded  //
/////////////////////////////////////////////////////////////////////
function startup(){

	// Setup the mouse coordinate printing on the screen
	reportSpectrumBin();

	document.getElementById(SVparam.canvasID).onmousedown = function(event){
			SVparam.XMouseLimitxMin = parseInt((document.getElementById(SVparam.canvasID).relMouseCoords(event).x-SVparam.leftMargin)/SVparam.binWidth + SVparam.XaxisLimitMin);
		};
	document.getElementById(SVparam.canvasID).onmouseup = function(event){
			SVparam.XMouseLimitxMax = parseInt((document.getElementById(SVparam.canvasID).relMouseCoords(event).x-SVparam.leftMargin)/SVparam.binWidth + SVparam.XaxisLimitMin); 
			DragWindow();
			ClickWindow( parseInt((document.getElementById(SVparam.canvasID).relMouseCoords(event).x-SVparam.leftMargin)/SVparam.binWidth + SVparam.XaxisLimitMin) );
		}

	document.getElementById(SVparam.canvasID2D).onmousedown = function(event){mDown2D(event)};
	document.getElementById(SVparam.canvasID2D).onmouseup = function(event){mUp2D(event)};
	SVparam.canvas2D.addEventListener('mousemove', function(event){mMove2D(event)}, false);
	document.getElementById(SVparam.canvasID2D).onmouseout = function(event){document.getElementById('2Dcoords').innerHTML=''};

}
///////////////////////////////
// End of startup function   //
///////////////////////////////

/////////////////////////////////////////////////////////////////////
// Math.log10 function                                             //
// Function to calculate the logarithm with base 10 of the number  //
/////////////////////////////////////////////////////////////////////
Math.log10 = function(n) {
	return (Math.log(n)) / (Math.log(10));
}
////////////////////////////////
// End of Math.log10 function //
////////////////////////////////

/////////////////////////////////////////////////////////////////////
// resetData function                                              //
// Function to zero the data array and in the ODB                  //
/////////////////////////////////////////////////////////////////////
function resetData(){
	var i;
	// Zero the data array in the ODB
	// ODBSet("/Analyzer/Parameters/Gate0/reset",1);

	// Zero the data array
	for(i=0; i<512; i++) SVparam.data[i]=0;

	// Redraw with the zeroed data values 
	plot_data(0);
}  
///////////////////////////////
// End of resetData function //
///////////////////////////////

/////////////////////////////////////////////////////////////////////
// plot_data function                                              //
// Function to reload and redraw the data points in the spectrum   //
// Two data display options are available, Stairs and Points       //
// Stairs option: The coordinates of a polyline are saved for each //
// data point. The coordinates are then set in the svg element.    //
// Points option: The coordinates of each data point are saved     //
// directly as the coordinates of a svg circle element.            //
// If the data exceeds the Y limit or the maximum value is well    //
// below the limit then the axis will be redrawn                   //
/////////////////////////////////////////////////////////////////////
function plot_data(RefreshNow, abandonBuffer){
	var i, j, data, thisSpec,
	thisData = [];
	SVparam.entries = [];
	
	SVparam.YaxisLimitMax=5;
	SVparam.XaxisLength = SVparam.XaxisLimitMax - SVparam.XaxisLimitMin;

	//abandon the fit when re-drawing the plot
	if(SVparam.Fitted==1){
		document.getElementById('fitbox').innerHTML = '';
		SVparam.Fitted=0;
	}

	SVparam.maxYvalue=SVparam.YaxisLimitMax;
	// Loop through to get the data and set the Y axis limits
	for(thisSpec=0; thisSpec<SVparam.DisplayedSpecs.length; thisSpec++){
		// Here call function to get data from the server
		// thisData[thisSpec]=ODBGet("/Test/spectrum_data[*]","%d");
		thisData[thisSpec]=getSpecData(SVparam.DisplayedSpecs[thisSpec], abandonBuffer);

		//Find the maximum X value from the size of the data
		if(thisData[thisSpec].length>SVparam.XaxisLimitAbsMax){
			SVparam.XaxisLimitAbsMax=thisData[thisSpec].length;

			// Create more datapoints here if required for this spectrum
		}

		// Find maximum Y value in the part of the spectrum to be displayed
		if(Math.max.apply(Math, thisData[thisSpec].slice(Math.floor(SVparam.XaxisLimitMin),Math.floor(SVparam.XaxisLimitMax)))>SVparam.maxYvalue){
			SVparam.maxYvalue=Math.max.apply(Math, thisData[thisSpec].slice(Math.floor(SVparam.XaxisLimitMin),Math.floor(SVparam.XaxisLimitMax)));
		}

		// Find the sum of everything in the current x range
		data = thisData[thisSpec].slice(  Math.floor(SVparam.XaxisLimitMin),Math.floor(SVparam.XaxisLimitMax)   );
		SVparam.totalEntries = 0;
		for(j=0; j<data.length; j++ ){
			SVparam.totalEntries += data[j];
		}

		//report number of entries on canvas:
		SVparam.entries[thisSpec] = SVparam.totalEntries;

	}// End of for loop

	// Adjust the Y axis limit and compression and redraw the axis
	if(SVparam.maxYvalue>5){
		if(SVparam.AxisType==0) SVparam.YaxisLimitMax=Math.floor(SVparam.maxYvalue*1);
		if(SVparam.AxisType==1) SVparam.YaxisLimitMax=SVparam.maxYvalue*10;
	} else {
		if(SVparam.AxisType==0) SVparam.YaxisLimitMax=5;
		if(SVparam.AxisType==1) SVparam.YaxisLimitMax=50;
	}

	if(SVparam.AxisType==0)
		SVparam.YaxisLength=SVparam.YaxisLimitMax-SVparam.YaxisLimitMin;

	if(SVparam.AxisType==1)
		SVparam.YaxisLength=Math.log10(SVparam.YaxisLimitMax-SVparam.YaxisLimitMin);

	drawFrame();

	// Now the limits are set loop through and plot the data points
	for(thisSpec=0; thisSpec<SVparam.DisplayedSpecs.length; thisSpec++){

		SVparam.context.textBaseline = 'top';
		SVparam.context.fillStyle = SVparam.dataColor[thisSpec];
		SVparam.context.fillText(SVparam.spectrum_names[SVparam.DisplayedSpecs[thisSpec]] + ': '+SVparam.entries[thisSpec] + ' entries', SVparam.canvas.width - SVparam.rightMargin - SVparam.context.measureText(SVparam.spectrum_names[SVparam.DisplayedSpecs[thisSpec]] + ': '+SVparam.entries[thisSpec] + 'entries').width, thisSpec*16);

		SVparam.data=thisData[thisSpec].slice();

		// Loop through the data spectrum that we have
		//start the canvas path:
		SVparam.context.strokeStyle = SVparam.dataColor[thisSpec];
		SVparam.context.beginPath();
		SVparam.context.moveTo(SVparam.leftMargin, SVparam.canvas.height - SVparam.bottomMargin);
		for(i=Math.floor(SVparam.XaxisLimitMin); i<Math.floor(SVparam.XaxisLimitMax); i++){

			// Protection at the end of the spectrum (minimum and maximum X)
			if(i<SVparam.XaxisLimitMin || i>SVparam.XaxisLimitMax) continue;

			// Protection in Overlay mode for spectra which are shorter (in x) than the longest spectrum overlayed.
			if(i>=SVparam.data.length) continue;

			// If using Stairs data display
			// Record the coordinates of this data point along the polyline
			// The coordinates are set following this for loop
			if(SVparam.DataType==0){
				if(SVparam.AxisType==0){
					//draw canvas line:
					//left side of bar
					SVparam.context.lineTo( SVparam.leftMargin + (i-SVparam.XaxisLimitMin)*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin - SVparam.data[i]*SVparam.countHeight );
					//top of bar
					SVparam.context.lineTo( SVparam.leftMargin + (i+1-SVparam.XaxisLimitMin)*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin - SVparam.data[i]*SVparam.countHeight );
				}

				if(SVparam.AxisType==1){
					//draw canvas line:
					if(SVparam.data[i] > 0){
						//left side of bar
						SVparam.context.lineTo( SVparam.leftMargin + (i-SVparam.XaxisLimitMin)*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin - (Math.log10(SVparam.data[i]) - Math.log10(SVparam.YaxisLimitMin))*SVparam.countHeight );
						//top of bar
						SVparam.context.lineTo( SVparam.leftMargin + (i+1-SVparam.XaxisLimitMin)*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin - (Math.log10(SVparam.data[i]) - Math.log10(SVparam.YaxisLimitMin))*SVparam.countHeight );
					} else {
						//drop to the x axis
						SVparam.context.lineTo( SVparam.leftMargin + (i-SVparam.XaxisLimitMin)*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin );
						//crawl along x axis until log-able data is found:
						SVparam.context.lineTo( SVparam.leftMargin + (i+1-SVparam.XaxisLimitMin)*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin );
					}
				}

			}

		}
		//finish the canvas path:
		SVparam.context.lineTo(SVparam.canvas.width - SVparam.rightMargin, SVparam.canvas.height - SVparam.bottomMargin );
		SVparam.context.closePath();
		SVparam.context.stroke();

	} // End of for loop

	// Pause for some time and then recall this function to refresh the data display
	if(SVparam.RefreshTime>0 && RefreshNow==1) SVparam.refreshHandler = setTimeout(function(){plot_data(1, 'true')},SVparam.RefreshTime*1000); 
	
}
///////////////////////////////
// End of plot_data function //
///////////////////////////////

//draw the plot frame
function drawFrame(){
	var binsPerTick, countsPerTick, i, label;

	//determine bin render width
	SVparam.binWidth = SVparam.xAxisPixLength / (SVparam.XaxisLimitMax - SVparam.XaxisLimitMin);
	//determine the scale render height per count for linear view:
	SVparam.countHeight = SVparam.yAxisPixLength / SVparam.YaxisLength;

	//clear canvas
	SVparam.context.clearRect(0,0,SVparam.canvWidth, SVparam.canvHeight);

	//draw principle axes:
	SVparam.context.strokeStyle = '#FFFFFF';
	SVparam.context.fillStyle = '#FFFFFF';
	SVparam.context.lineWidth = 1;
	SVparam.context.beginPath();
	SVparam.context.moveTo(SVparam.leftMargin, SVparam.topMargin);
	SVparam.context.lineTo(SVparam.leftMargin, SVparam.canvas.height-SVparam.bottomMargin);
	SVparam.context.lineTo(SVparam.canvas.width - SVparam.rightMargin, SVparam.canvas.height - SVparam.bottomMargin);
	SVparam.context.stroke();

	//Decorate x axis////////////////////////////////////////////////////////
	//decide how many ticks to draw on the x axis:
	SVparam.nXticks = 6;

	//come as close to a factor of the number of bins as possible:
	while( Math.floor(SVparam.XaxisLength / SVparam.nXticks) == Math.floor(SVparam.XaxisLength / (SVparam.nXticks-1)) )
		SVparam.nXticks--;
	//draw at most one tick per bin:
	if(SVparam.XaxisLength < (SVparam.nXticks-1) )
		SVparam.nXticks = SVparam.XaxisLength+1

	//how many bins should there be between each tick?
	binsPerTick = Math.floor((SVparam.XaxisLimitMax - SVparam.XaxisLimitMin) / (SVparam.nXticks-1));

	//draw x axis ticks & labels:
	for(i=0; i<SVparam.nXticks; i++){
		//ticks
		SVparam.context.beginPath();
		SVparam.context.moveTo(SVparam.leftMargin + i*binsPerTick*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin);
		SVparam.context.lineTo(SVparam.leftMargin + i*binsPerTick*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin + SVparam.tickLength);
		SVparam.context.stroke();

		//labels
		label = (SVparam.XaxisLimitMin + i*binsPerTick).toFixed(0);
		SVparam.context.textBaseline = 'top';
		SVparam.context.fillText(label, SVparam.leftMargin + i*binsPerTick*SVparam.binWidth - SVparam.context.measureText(label).width/2, SVparam.canvas.height - SVparam.bottomMargin + SVparam.tickLength + SVparam.xLabelOffset);
	}

	//Decorate Y axis/////////////////////////////////////////////////////////
	//decide how many ticks to draw on the y axis:
	SVparam.nYticks = 5;
	//come as close to a factor of the number of bins as possible:
	while( Math.floor(SVparam.YaxisLength / SVparam.nYticks) == Math.floor(SVparam.YaxisLength / (SVparam.nYticks-1)) )
		SVparam.nYticks--;

	//how many counts should each tick increment?
	countsPerTick = Math.floor(SVparam.YaxisLength / (SVparam.nYticks-1));

	//draw y axis ticks and labels:
	for(i=0; i<SVparam.nYticks; i++){
		//ticks
		SVparam.context.beginPath();
		SVparam.context.moveTo(SVparam.leftMargin, SVparam.canvas.height - SVparam.bottomMargin - i*countsPerTick*SVparam.countHeight);
		SVparam.context.lineTo(SVparam.leftMargin - SVparam.tickLength, SVparam.canvas.height - SVparam.bottomMargin - i*countsPerTick*SVparam.countHeight);
		SVparam.context.stroke();

		//labels
		SVparam.context.textBaseline = 'middle';
		if(SVparam.AxisType == 0){ //linear scale
			label = (SVparam.YaxisLimitMax<10000) ? (i*countsPerTick).toFixed(0) : (i*countsPerTick).toExponential(1);
			SVparam.context.fillText(label, SVparam.leftMargin - SVparam.tickLength - SVparam.yLabelOffset - SVparam.context.measureText(label).width, SVparam.canvas.height - SVparam.bottomMargin - i*countsPerTick*SVparam.countHeight);
		} else {  //log scale
			label = i*countsPerTick-1;
			//exponent
			SVparam.context.font = SVparam.expFont;
			SVparam.context.fillText(label, SVparam.leftMargin - SVparam.tickLength - SVparam.yLabelOffset - SVparam.context.measureText(label).width, SVparam.canvas.height - SVparam.bottomMargin - i*countsPerTick*SVparam.countHeight - 10);
			//base
			SVparam.context.font = SVparam.baseFont;
			SVparam.context.fillText('10', SVparam.leftMargin - SVparam.tickLength - SVparam.yLabelOffset - SVparam.context.measureText('10'+label).width, SVparam.canvas.height - SVparam.bottomMargin - i*countsPerTick*SVparam.countHeight);
		}
	}

	//x axis title:
	SVparam.context.textBaseline = 'bottom';
	SVparam.context.fillText('Channels', SVparam.canvas.width - SVparam.rightMargin - SVparam.context.measureText('Channels').width, SVparam.canvas.height);

	//y axis title:
	SVparam.context.textBaseline = 'alphabetic';
	SVparam.context.save();
	SVparam.context.translate(SVparam.leftMargin*0.25, SVparam.context.measureText('Counts').width + SVparam.topMargin );
	SVparam.context.rotate(-Math.PI/2);
	SVparam.context.fillText('Counts', 0,0);
	SVparam.context.restore();

}

function RequestFitLimits(){
	var x;

	//enter fit mode:
	SVparam.fitModeEngage = 1;

	SVparam.FitLimitLower=-1;
	SVparam.FitLimitUpper=-1;

	document.getElementById('fitbox').innerHTML = 'Select fit region with Mouse clicks';

}

function FitData(){
	var cent, fitdata, i, max, width, x, y, height;

	//suspend the refresh
	window.clearTimeout(SVparam.refreshHandler);
	//set refresh option to 'off'
	document.getElementById("refreshRate").value = 0;

	if(SVparam.FitLimitLower<0) SVparam.FitLimitLower=0;
	if(SVparam.FitLimitUpper>SVparam.XaxisLimitAbsMax) SVparam.FitLimitUpper=SVparam.XaxisLimitAbsMax;

	max=1;

	fitdata=getSpecData(SVparam.DisplayedSpecs[0]);
	fitdata=fitdata.slice(SVparam.FitLimitLower,SVparam.FitLimitUpper);

	// Find maximum Y value in the fit data
	if(Math.max.apply(Math, fitdata)>max){
		max=Math.max.apply(Math, fitdata);
	}

	// Find the bin with the maximum Y value
	cent=0;
	while(fitdata[cent]<max){
		cent++;
	}

	// Find the width of the peak
	x=cent;
	while(fitdata[x]>(max/2.0)) x--; 
	width=x;
	x=cent;
	while(fitdata[x]>(max/2.0)) x++; 
	width=x-width;
	if(width<1) width=1;
	width/=2.35;

	cent=cent+SVparam.FitLimitLower+0.5;

	//set up canvas for drawing fit line
	SVparam.context.lineWidth = 3;
	SVparam.context.strokeStyle = '#FF0000';
	SVparam.context.beginPath();
	SVparam.context.moveTo( SVparam.leftMargin + (SVparam.FitLimitLower-SVparam.XaxisLimitMin)*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin - max*Math.exp(-1*(((SVparam.FitLimitLower-cent)*(SVparam.FitLimitLower-cent))/(2*width*width)))*SVparam.countHeight);

	for(i=0;i<fitdata.length;i+=0.2){
		//draw fit line on canvas:
		x=i+SVparam.FitLimitLower;
		y = max*Math.exp(-1*(((x-cent)*(x-cent))/(2*width*width)));
		if(i!=0){
			if(SVparam.AxisType == 0){
				SVparam.context.lineTo( SVparam.leftMargin + (SVparam.FitLimitLower-SVparam.XaxisLimitMin)*SVparam.binWidth + i*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin - y*SVparam.countHeight);
			} else if(SVparam.AxisType == 1){
				if(y<=0) height = 0;
				else height = Math.log10(y) - Math.log10(SVparam.YaxisLimitMin);
				if(height<0) height = 0;

				SVparam.context.lineTo( SVparam.leftMargin + (SVparam.FitLimitLower-SVparam.XaxisLimitMin)*SVparam.binWidth + i*SVparam.binWidth, SVparam.canvas.height - SVparam.bottomMargin - height*SVparam.countHeight);
			}
		}
	}

	SVparam.context.stroke();

	SVparam.word = 'Height = ' + max + ' Width = ' + width.toFixed(3) + ' Centroid = ' + cent;
	document.getElementById('fitbox').innerHTML = SVparam.word;
	SVparam.word = 'H=' + max + ',W=' + width.toFixed(3) + ',C=' + cent + "; ";
	document.getElementById('spec_fits0').innerHTML = SVparam.word+document.getElementById('spec_fits0').innerHTML;

	SVparam.Fitted=1;
	SVparam.fitModeEngage = 0;
}

function Menu_unSelectAll(){
	var i, j;

	document.getElementById("displayMistake").innerHTML="";
	// Reset the properties of the rows which were selected
	j=0;
	if(SVparam.Specs.length>0){
		while(j<SVparam.Specs.length){
			i=SVparam.Specs[j];
			document.getElementById("row"+i).setAttribute('style', "background-color:#333333");
			document.getElementById("row"+i).setAttribute('onclick', 'Menu_MakeselectSpectrum(event,'+i+')');
			j++;
		}
	}
	SVparam.Specs = [];
}

function GetList(newhost){
	var i, row, table,
		RemoveTable = 0;

	//enable all other 1D buttons
	document.getElementById('displayB').disabled = false;
	document.getElementById('overlayB').disabled = false;
	document.getElementById('clearB').disabled = false;
	document.getElementById('gridB').disabled = false;
	document.getElementById('prev1D').disabled = false;
	document.getElementById('next1D').disabled = false;

	// Check if a list is already loaded by the hostname being defined
	// if yes then set a flag for the old list to be removed later in this function
	if(SVparam.hostname.length>0) RemoveTable=1; 

	table = document.getElementById("main_table");
	table.innerHTML = '';
	
	if(!SVparam.devMode){
		// Here call the function to Get the spectrum list from the server
		SVparam.spectrum_names = getList();
		for(i=0; i<SVparam.spectrum_names.length; i++){
			row = document.createElement('li');
			row.setAttribute('id', "row"+i);
			row.setAttribute('style', "background-color:#333333; display:block; cursor:default");
			row.setAttribute('onclick', "Menu_MakeselectSpectrum(event,"+i+")");
			row.setAttribute('ondblclick', "displaySpectrum("+i+")");
			table.appendChild(row);
			document.getElementById('row'+i).innerHTML = SVparam.spectrum_names[i];

		}
	} else {
		// Put in fake list info - COMMENT OUT ONCE ABOVE FUNCTION IS WORKING
			for(i=0; i<50; i++){
				row = document.createElement('li');
				row.setAttribute('id', "row"+i);
				row.setAttribute('style', "background-color:#333333; display:block; cursor:default");
				table.appendChild(row);
				document.getElementById('row'+i).onmousedown = function(event){event.preventDefault();};
				document.getElementById('row'+i).onclick = function(event){ Menu_MakeselectSpectrum(event, parseInt(this.id.slice(3,this.id.length+1))  )};
				//document.getElementById('row'+i).ondblclick = function(){displaySpectrum( parseInt(this.id.slice(3,this.id.length+1)) )};
				document.getElementById('row'+i).innerHTML ="Spectrum Name "+i;
				SVparam.spectrum_names[i]="Spectrum Name "+i;
		}
	}
}

function GetList2D(){
	var i, row, table;

	table = document.getElementById("menuTable2D");
	table.innerHTML = '';

	if(!SVparam.devMode){

	} else {
		row = document.createElement('li');
		row.setAttribute('id', 'row2D0');
		row.setAttribute('style', "background-color:#333333; display:block; cursor:default");
		table.appendChild(row);
		document.getElementById('row2D0').innerHTML = 'Gaussian';
		document.getElementById('row2D0').data = window.thisData;
		document.getElementById('row2D0').onclick = function(event){select2Dspectra(this.id)};

		row = document.createElement('li');
		row.setAttribute('id', 'row2D1');
		row.setAttribute('style', "background-color:#333333; display:block; cursor:default");
		table.appendChild(row);
		document.getElementById('row2D1').innerHTML = 'White Noise';
		document.getElementById('row2D1').data = window.whiteNoise;
		document.getElementById('row2D1').onclick = function(event){select2Dspectra(this.id)};
	}

}

function select2Dspectra(id){
	var i = 0;

	//unhighlight everyone else:
	while(document.getElementById('row2D'+i)){
		document.getElementById('row2D'+i).setAttribute('style', 'background-color:#333333');
		i++;
	}

	//highlight this one:
	document.getElementById(id).setAttribute('style', 'background-color:lightblue');

	//stick the data in the place the plotting function is going to go looking for it at:
	window.data2D = document.getElementById(id).data;

	//plots ahoy:
	plot_data2D(1, 'true');
}

function DisplaySpecs(){
	var j, num;

	SVparam.XaxisLimitAbsMax=500;
	SVparam.YaxisLimitMax=5;
	document.getElementById("displayMistake").innerHTML="";

	if(SVparam.Specs.length>1){
		reset_list_color();
		SVparam.DisplayedSpecs=[];
		SVparam.NumSpecsDisplayed=0;
		drawFrame();
		OverlaySpecs();
		return;
	}
	if(SVparam.Specs.length==0){
		clearSpecs()
		return;
	}

	reset_list_color();
	SVparam.word="";
	num=(SVparam.Specs.length-1);

	if(num>=0){
		while(num>=0){
			List_update(SVparam.Specs[num],0);
			num--;
			if(num<0) break;
		}
	}
	SVparam.DisplayedSpecs=SVparam.Specs.slice();
	SVparam.NumSpecsDisplayed=1;
	Menu_unSelectAll();
	plot_data(0);
}

function nextSpec(){

	if(SVparam.DisplayedSpecs.length != 1){
		Menu_unSelectAll();
		Menu_MakeselectSpectrum('',0);

	} else{
		Menu_unSelectAll();
		Menu_MakeselectSpectrum('',Math.min(SVparam.DisplayedSpecs[0] + 1, SVparam.spectrum_names.length-1 ))
	}
}

function prevSpec(){

	if(SVparam.DisplayedSpecs.length != 1){
		Menu_unSelectAll();
		Menu_MakeselectSpectrum('',SVparam.spectrum_names.length-1);

	} else{
		Menu_unSelectAll();
		Menu_MakeselectSpectrum('',Math.max(0,SVparam.DisplayedSpecs[0] - 1))
	}
}

function nextSpec(){

	if(SVparam.DisplayedSpecs.length != 1){
		Menu_unSelectAll();
		Menu_MakeselectSpectrum('',0);

	} else{
		Menu_unSelectAll();
		Menu_MakeselectSpectrum('',SVparam.DisplayedSpecs[0] + 1)

		//console.log(SVparam.DisplayedSpecs[0])
	}
}

function OverlaySpecs(){
	var j, x;

	SVparam.XaxisLimitAbsMax=500;
	SVparam.YaxisLimitMax=5;
	document.getElementById("displayMistake").innerHTML="";

	//don't repeat yourself:
	for(j=0; j<SVparam.Specs.length; j++){
		if(SVparam.DisplayedSpecs.indexOf(SVparam.Specs[j]) != -1){
			Menu_unselectSpectrum(SVparam.Specs[j]);
			OverlaySpecs();
			return;
		}
	}

	if((SVparam.Specs.length+SVparam.NumSpecsDisplayed)>10){
		document.getElementById("displayMistake").innerHTML="Maximum of 10 spectra can be overlayed";
		return;
	}

	// Plot the spectra
	for(j=0; j<SVparam.Specs.length; j++){
		SVparam.DisplayedSpecs[SVparam.DisplayedSpecs.length]=SVparam.Specs[j];
		List_update(SVparam.Specs[j],SVparam.NumSpecsDisplayed+j);
	}
	plot_data(0);

	SVparam.NumSpecsDisplayed=SVparam.NumSpecsDisplayed+SVparam.Specs.length;
	Menu_unSelectAll();
}

function Menu_MakeselectSpectrum(oEvent,id){
	var i, id1;

	//cycling with next / prev buttons
	if(!oEvent){
		Menu_selectSpectrum(id);
		DisplaySpecs();
		return;		
	}

	oEvent.preventDefault();

	if (oEvent.shiftKey){
		// Multi-select with mouse button and Shift key 
		if(SVparam.Specs.length>0){
			// Call Menu_selectSpectrum multiple times
			id1=SVparam.Specs[SVparam.Specs.length-1];
			if(id1>id){
				for(i=id; i<id1; i++) Menu_selectSpectrum(i, true);
			} else {
				for(i=id1+1; i<=id; i++){ Menu_selectSpectrum(i, true); }
			}
		} else {
			// Even though shift key is used, this is the first spectrum so just select it
			Menu_selectSpectrum(id);
		}
	} else if(oEvent.metaKey){
		Menu_selectSpectrum(id, true);
	} else {
		// Single-select with mouse button only
		Menu_selectSpectrum(id);
		DisplaySpecs();
	}
}

function Menu_selectSpectrum(id, append){
	var j, rowID;

	if(!append) Menu_unSelectAll();

	if(SVparam.Specs.indexOf(id) == -1){

		rowID = document.getElementById("row"+id);
		rowID.setAttribute('style', "background-color:lightblue;");
		rowID.setAttribute('onclick', 'Menu_unselectSpectrum('+id+')');

		// Add this spectrum to the Specs list
		SVparam.Specs[SVparam.Specs.length]=id;
	}
}

function List_update(id,colorID) {
	var i, table, row;

	table = document.getElementById("recent_list");
	//don't duplicate things in the list:
	for(i=0; i<table.getElementsByTagName("tr").length; i++){
		if(table.getElementsByTagName('tr')[i].innerHTML.indexOf(SVparam.spectrum_names[id]) != -1)
			table.deleteRow(i);
	}

	SVparam.word='<td width="25px" align="center" id="box'+colorID+'" style="display:inline-block;width:20px;background-color:'+SVparam.dataColor[colorID]+';color:'+SVparam.dataColor[colorID]+'">:-)</td><td width="150px" align="center"><button type="button" class="navLink" value="Display" onclick="displaySpectrum('+id+')">Display</button>'+' <button type="button" class="navLink" value="Overlay" onclick="overlaySpectrum('+id+')">Overlay</button></td><td width="225px">'+SVparam.spectrum_names[id]+' </td><td id="spec_fits'+colorID+'"></td>';
	table.setAttribute('style', 'display:block; margin-top:10px;')
	row = table.insertRow(0);
	row.innerHTML =SVparam.word;

	i = table.getElementsByTagName("tr").length;
	if(i>40) table.deleteRow(i-1);
}

function reset_list_color(){
	var j, x;

	for(j=0; j<10; j++){
		x=document.getElementById("box"+j);
		if(x){
			x.setAttribute('style', "background-color:#333333;color:#333333");
			x.setAttribute('id', "");
		}
	}
}

function displaySpectrum(id){
	var j;

	document.getElementById("displayMistake").innerHTML="";

	SVparam.XaxisLimitAbsMax=500;
	SVparam.YaxisLimitMax=5;
	reset_list_color();
	Menu_unSelectAll();
	SVparam.Specs[0]=id;
	List_update(id,0);

	SVparam.DisplayedSpecs=SVparam.Specs.slice();
	SVparam.NumSpecsDisplayed=1;
	plot_data(0);
}

function overlaySpectrum(id){
	var j, x;

	document.getElementById("displayMistake").innerHTML="";

	// Check for duplicates
	j=0;
	if(SVparam.DisplayedSpecs.length>0){
		while(j<SVparam.DisplayedSpecs.length){
			if(SVparam.DisplayedSpecs[j]!=id) j++;
			else {
				SVparam.word='Spectrum "'+SVparam.spectrum_names[id]+'" already displayed';
				document.getElementById("displayMistake").innerHTML=SVparam.word;
				return;
			}
		}
	}

	// Add this spectrum to the Specs list
	//SVparam.Specs[SVparam.Specs.length]=id;
	SVparam.Specs = [id]  //dubious hack seems to fix the funky behavior of the above line - first use of overlay duplicated the original spectrum, investigate.

	//Check number of displayed spectra
	if((SVparam.Specs.length+SVparam.NumSpecsDisplayed)>10){
		document.getElementById("displayMistake").innerHTML="Maximum of 10 spectra can be overlayed";
		return;
	}

	// Plot the spectra
	for(j=0; j<SVparam.Specs.length; j++){
		SVparam.DisplayedSpecs[SVparam.DisplayedSpecs.length]=SVparam.Specs[j];
		List_update(SVparam.Specs[j],SVparam.NumSpecsDisplayed+j);
	}
	plot_data(0);

	SVparam.NumSpecsDisplayed=SVparam.NumSpecsDisplayed+SVparam.Specs.length;
	Menu_unSelectAll();
}

function Menu_unselectSpectrum(id){
	var j;

	//colors and clicks:
	document.getElementById("displayMistake").innerHTML="";
	document.getElementById("row"+id).setAttribute('style', "background-color:#333333;");
	document.getElementById("row"+id).setAttribute('onclick', "Menu_selectSpectrum("+id+")");

	// Remove this spectrum from the SVparam.Spec array
	for(j=0; j<SVparam.Specs.length; j++){
		if(SVparam.Specs[j] == id)
			SVparam.Specs.splice(j,1);
	}

}

function clearSpecs(){

	//1D:
	if(document.getElementById('LowerXLimit')){
		reset_list_color();
		SVparam.Specs=[];

		SVparam.DisplayedSpecs=SVparam.Specs.slice();
		SVparam.NumSpecsDisplayed=0;

		drawFrame();
	}
	//2D:
	if(document.getElementById('LowerXLimit2D')){
		draw2Dframe();
	}

}

function getSpecData(x, abandonBuffer){
	if(!SVparam.devMode){
		if(SVparam.dataBuffer[parseInt(x)] && !abandonBuffer){
			return SVparam.dataBuffer[parseInt(x)];
		} else {
			SVparam.dataBuffer[parseInt(x)] = getData(parseInt(x));
			return SVparam.dataBuffer[parseInt(x)];
		}
	} else {
		if(x==0) return SVfakeData.energydata0;
		if(x==1) return SVfakeData.energydata1;
		if(x==2) return SVfakeData.energydata2;
		if(x==3) return SVfakeData.energydata3;
		if(x==4) return SVfakeData.energydata4;
	}
}

function relMouseCoords(event){
    var totalOffsetX = 0,
    totalOffsetY = 0,
    canvasX = 0,
    canvasY = 0,
    currentElement = this,
    test = [],
    elts = [];

	if (event.offsetX !== undefined && event.offsetY !== undefined) { return {x:event.offsetX, y:event.offsetY}; }
	//if (event.layerX !== undefined && event.layerY !== undefined) { return {x:event.layerX, y:event.layerY}; }

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
        //test[test.length] = currentElement.offsetLeft - currentElement.scrollLeft
        //elts[elts.length] = currentElement
    }
    while(currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    //hack to deal with FF scroll, better solution TBD:
    if(event.offsetX == undefined){
    	canvasX -= document.body.scrollLeft;
    	canvasY -= document.body.scrollTop;
    }

    return {x:canvasX, y:canvasY}
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

//call <target==1,2>D view to display in Spectrum Control panel
function summonView(target){
	if(target==1){
		document.getElementById('spectrumBlock2D').setAttribute('style', 'display:none;');
		document.getElementById('spectrumBlock1D').setAttribute('style', '');
		document.getElementById('overlayB').setAttribute('style', '');
	} else if(target==2){
		document.getElementById('spectrumBlock1D').setAttribute('style', 'display:none;');
		document.getElementById('spectrumBlock2D').setAttribute('style', '');
		document.getElementById('spectrumBlock2D').setAttribute('width', '100%');
		document.getElementById('overlayB').setAttribute('style', 'display:none');
	}
}


//stuff for 2D mode///////////////////////////////////////////////////////////////////////////////////
//draw the frame for the 2D view:
function draw2Dframe(){
	var binsPerTick, i, label;

	//determine bin render width
	SVparam.binWidth2D  = SVparam.xAxisPixLength2D / (SVparam.XaxisLimitMax2D - SVparam.XaxisLimitMin2D);
	SVparam.binHeight2D = SVparam.yAxisPixLength2D / (SVparam.YaxisLimitMax2D - SVparam.YaxisLimitMin2D);

	//clear canvas
	SVparam.context2D.clearRect(0,0,SVparam.canvWidth2D, SVparam.canvHeight2D);

	//draw principle axes:
	SVparam.context2D.strokeStyle = '#FFFFFF';
	SVparam.context2D.fillStyle = '#FFFFFF';
	SVparam.context2D.lineWidth = 1;
	SVparam.context2D.beginPath();
	SVparam.context2D.moveTo(SVparam.leftMargin2D, SVparam.topMargin2D);
	SVparam.context2D.lineTo(SVparam.leftMargin2D, SVparam.canvas2D.height-SVparam.bottomMargin2D);
	SVparam.context2D.lineTo(SVparam.canvas2D.width - SVparam.rightMargin2D - SVparam.zScaleMargin, SVparam.canvas2D.height - SVparam.bottomMargin2D);
	SVparam.context2D.stroke();

	//Decorate x axis////////////////////////////////////////////////////////
	//decide how many ticks to draw on the x axis:
	SVparam.nXticks = 6;
	//draw at most one tick per bin:
	if(SVparam.XaxisLength2D < (SVparam.nXticks-1) )
		SVparam.nXticks = SVparam.XaxisLength2D+1
	//come as close to a factor of the number of bins as possible:
	while( Math.floor(SVparam.XaxisLength2D / SVparam.nXticks) == Math.floor(SVparam.XaxisLength2D / (SVparam.nXticks-1)) )
		SVparam.nXticks--;

	//how many bins should there be between each tick?
	binsPerTick = Math.floor((SVparam.XaxisLimitMax2D - SVparam.XaxisLimitMin2D) / (SVparam.nXticks-1));

	//draw x axis ticks & labels:
	for(i=0; i<SVparam.nXticks; i++){
		//ticks
		SVparam.context2D.beginPath();
		SVparam.context2D.moveTo(SVparam.leftMargin2D + i*binsPerTick*SVparam.binWidth2D, SVparam.canvas2D.height - SVparam.bottomMargin2D);
		SVparam.context2D.lineTo(SVparam.leftMargin2D + i*binsPerTick*SVparam.binWidth2D, SVparam.canvas2D.height - SVparam.bottomMargin2D + SVparam.tickLength);
		SVparam.context2D.stroke();

		//labels
		label = (SVparam.XaxisLimitMin2D + i*binsPerTick).toFixed(0);
		SVparam.context2D.textBaseline = 'top';
		SVparam.context2D.fillText(label, SVparam.leftMargin2D + i*binsPerTick*SVparam.binWidth2D - SVparam.context2D.measureText(label).width/2, SVparam.canvas2D.height - SVparam.bottomMargin2D + SVparam.tickLength + SVparam.xLabelOffset);
	}

	//Decorate Y axis/////////////////////////////////////////////////////////
	//decide how many ticks to draw on the y axis:
	SVparam.nYticks = 6;
	//come as close to a factor of the number of bins as possible:
	while( Math.floor(SVparam.YaxisLength2D / SVparam.nYticks) == Math.floor(SVparam.YaxisLength2D / (SVparam.nYticks-1)) )
		SVparam.nYticks--;

	//how many bins should each tick increment?
	binsPerTick = Math.floor(SVparam.YaxisLength2D / (SVparam.nYticks-1));

	//draw y axis ticks and labels:
	for(i=0; i<SVparam.nYticks; i++){
		//ticks
		SVparam.context2D.beginPath();
		SVparam.context2D.moveTo(SVparam.leftMargin2D, SVparam.canvas2D.height - SVparam.bottomMargin2D - i*binsPerTick*SVparam.binHeight2D);
		SVparam.context2D.lineTo(SVparam.leftMargin2D - SVparam.tickLength, SVparam.canvas2D.height - SVparam.bottomMargin2D - i*binsPerTick*SVparam.binHeight2D);
		SVparam.context2D.stroke();

		//labels
		SVparam.context2D.textBaseline = 'middle';
		label = (SVparam.YaxisLimitMin2D + i*binsPerTick).toFixed(0);
		SVparam.context2D.fillText(label, SVparam.leftMargin2D - SVparam.tickLength - SVparam.yLabelOffset - SVparam.context2D.measureText(label).width, SVparam.canvas2D.height - SVparam.bottomMargin2D - i*binsPerTick*SVparam.binHeight2D);

	}

	//x axis title:
	SVparam.context2D.textBaseline = 'bottom';
	SVparam.context2D.fillText('x', SVparam.canvas2D.width - SVparam.rightMargin2D - SVparam.context2D.measureText('x').width - SVparam.zScaleMargin, SVparam.canvas2D.height);

	//y axis title:
	SVparam.context2D.textBaseline = 'alphabetic';
	SVparam.context2D.save();
	SVparam.context2D.translate(SVparam.leftMargin2D*0.25, SVparam.context2D.measureText('y').width + SVparam.topMargin2D );
	SVparam.context2D.rotate(-Math.PI/2);
	SVparam.context2D.fillText('y', 0,0);
	SVparam.context2D.restore();

}

function plot_data2D(RefreshNow, abandonBuffer){
	var i, j, data, thisSpec, 
	entries = 0,
	thisData = [];
	SVparam.entries = [];

	//echo back the axis limits in the input textboxes:
	document.getElementById('LowerXLimit2D').value = SVparam.XaxisLimitMin2D;
	document.getElementById('UpperXLimit2D').value = SVparam.XaxisLimitMax2D;
	document.getElementById('LowerYLimit').value = SVparam.YaxisLimitMin2D;
	document.getElementById('UpperYLimit').value = SVparam.YaxisLimitMax2D;

	thisData = window.data2D;

/*
	if(SVparam.devMode){
		thisData = window.thisData;
	} else {
		if(abandonBuffer){
			thisData = getData2D(0).split(';');
			for(i=0; i<thisData.length; i++){
				thisData[i] = thisData[i].split(',');
				thisData[i] = {'x' : parseInt(thisData[i][0]), 'y' : parseInt(thisData[i][1]), 'z' : parseInt(thisData[i][2])}
			}
			SVparam.dataBuffer2D = thisData;
		} else {
			thisData = SVparam.dataBuffer2D;
		}
	}
*/

	//update axis range
	SVparam.XaxisLength2D=SVparam.XaxisLimitMax2D-SVparam.XaxisLimitMin2D;
	SVparam.YaxisLength2D=SVparam.YaxisLimitMax2D-SVparam.YaxisLimitMin2D;

	draw2Dframe();

	//determine the maximum z value:
	for(i=0; i<thisData.length; i++){
		if(!SVparam.logZ)
			SVparam.zMax = Math.max(SVparam.zMax, thisData[i].z);
		else 
			SVparam.zMax = Math.max(SVparam.zMax, Math.log10(thisData[i].z));
	}
	if(!SVparam.zMax)
		SVparam.zMax = 1;

	//fill in all the unpopulated bins:
	SVparam.context2D.fillStyle = scalepickr('unpopulated', 'ROOT Rainbow');
	SVparam.context2D.fillRect(SVparam.leftMargin2D, SVparam.canvHeight2D - SVparam.bottomMargin2D - SVparam.yAxisPixLength2D, SVparam.xAxisPixLength2D, SVparam.yAxisPixLength2D)

	//fill histo:
	for(i=0; i<thisData.length; i++){
		if(thisData[i].x >= SVparam.XaxisLimitMin2D && thisData[i].x < SVparam.XaxisLimitMax2D && thisData[i].y >= SVparam.YaxisLimitMin2D && thisData[i].y < SVparam.YaxisLimitMax2D){
			if(!SVparam.logZ)
				SVparam.context2D.fillStyle = scalepickr(thisData[i].z / SVparam.zMax, 'ROOT Rainbow');
			else
				SVparam.context2D.fillStyle = scalepickr( (Math.log10(thisData[i].z) - SVparam.logZmin ) / (SVparam.zMax - SVparam.logZmin ), 'ROOT Rainbow');

			SVparam.context2D.strokeStyle = SVparam.context2D.fillStyle;
			//SVparam.context2D.shadowColor = scalepickr(thisData[i].z, 'ROOT Rainbow');
			SVparam.context2D.fillRect(SVparam.leftMargin2D + (thisData[i].x-SVparam.XaxisLimitMin2D)*SVparam.binWidth2D, SVparam.canvas2D.height - SVparam.bottomMargin2D - (thisData[i].y-SVparam.YaxisLimitMin2D+1)*SVparam.binHeight2D ,SVparam.binWidth2D,SVparam.binHeight2D);
			SVparam.context2D.strokeRect(SVparam.leftMargin2D + (thisData[i].x-SVparam.XaxisLimitMin2D)*SVparam.binWidth2D, SVparam.canvas2D.height - SVparam.bottomMargin2D - (thisData[i].y-SVparam.YaxisLimitMin2D+1)*SVparam.binHeight2D ,SVparam.binWidth2D,SVparam.binHeight2D);
			entries += thisData[i].z;
		}
	}

	//report entries:
	SVparam.context2D.textBaseline = 'top';
	SVparam.context2D.fillStyle = '#999999';
	SVparam.context2D.fillText('Entries: '+entries, SVparam.canvas2D.width - SVparam.rightMargin2D - SVparam.context2D.measureText('Entries: '+entries).width - SVparam.zScaleMargin, 16);

	//overlay tbragg gates if running on tbragg:
	drawTbraggGates();

	//draw scale
	drawZscale();

	// Pause for some time and then recall this function to refresh the data display
	if(SVparam.RefreshTime>0 && RefreshNow==1)  SVparam.refreshHandler2D = setTimeout(function(){plot_data2D(1, 'true')},SVparam.RefreshTime*1000); 
}

//mouse down & mouse up behavior functions for 2D canvas:
function mDown2D(event){
	var x, y, xBin, yBin, coords;

	//prevent defaults from messing with the drag:
	event.preventDefault();

	//draggy hand:
	SVparam.activeCursor = 1;

	coords = document.getElementById(SVparam.canvasID2D).relMouseCoords(event);
	x = coords.x;
	y = coords.y;

	xBin = Math.floor((x-SVparam.leftMargin2D)/SVparam.binWidth2D + SVparam.XaxisLimitMin2D);
	yBin = Math.floor((SVparam.canvas2D.height-SVparam.bottomMargin2D - y)/SVparam.binHeight2D + SVparam.YaxisLimitMin2D);
	//if(xBin < 0) xBin = 0;
	//if(yBin < 0) yBin = 0;
	if(xBin < SVparam.XaxisLimitMin2D) xBin = SVparam.XaxisLimitMin2D;
	if(yBin < SVparam.YaxisLimitMin2D) yBin = SVparam.YaxisLimitMin2D;
	if(xBin > SVparam.XaxisLimitMax2D) xBin = SVparam.XaxisLimitMax2D;
	if(yBin > SVparam.YaxisLimitMax2D) yBin = SVparam.YaxisLimitMax2D;

	//drag a box if clicking in the plot field:
	if(x > SVparam.leftMargin2D && x < (SVparam.canvas2D.width - SVparam.rightMargin2D) && y>SVparam.topMargin2D && y<(SVparam.canvas2D.height-SVparam.bottomMargin2D)){
		SVparam.onclickXvals.min = xBin;
		SVparam.onclickYvals.min = yBin;
	} else if(y > (SVparam.canvas2D.height-SVparam.bottomMargin2D) && SVparam.clickX.down == -1 && SVparam.clickY.down == -1){ //clicking in the x-margin
		SVparam.clickX['down'] = xBin;
		//deal with the possibility that the user clicked on the ambiguous region in the bottom left corner and actually wanted the y-margin:
		if(x < SVparam.leftMargin2D)
			SVparam.clickY['down'] = yBin
	} else if (x < SVparam.leftMargin2D && SVparam.clickY.down == -1){  //user clicked in the y-margin
		SVparam.clickY['down'] = yBin;
	}
}

function mUp2D(event){
	var x, y, xBin, yBin, coords;

	//release draggy hand:
	SVparam.activeCursor = 0;

	coords = document.getElementById(SVparam.canvasID2D).relMouseCoords(event);
	x = coords.x;
	y = coords.y;

	xBin = Math.floor((x-SVparam.leftMargin2D)/SVparam.binWidth2D + SVparam.XaxisLimitMin2D);
	yBin = Math.floor((SVparam.canvas2D.height-SVparam.bottomMargin2D - y)/SVparam.binHeight2D + SVparam.YaxisLimitMin2D);
	if(xBin < SVparam.XaxisLimitMin2D) xBin = SVparam.XaxisLimitMin2D;
	if(yBin < SVparam.YaxisLimitMin2D) yBin = SVparam.YaxisLimitMin2D;
	if(xBin > SVparam.XaxisLimitMax2D) xBin = SVparam.XaxisLimitMax2D;
	if(yBin > SVparam.YaxisLimitMax2D) yBin = SVparam.YaxisLimitMax2D;

	//bail out on a single click:
	if( (xBin == SVparam.onclickXvals.min && yBin == SVparam.onclickYvals.min) || (xBin == SVparam.clickX['down'] && yBin == SVparam.clickY['down']) ){
		SVparam.onclickXvals = {'min':-1, 'max':-1};
		SVparam.onclickYvals = {'min':-1, 'max':-1};
		SVparam.clickX = {'down':-1, 'up':-1};
		SVparam.clickY = {'down':-1, 'up':-1};
		return;
	}

	if(SVparam.onclickXvals.min != -1){
		SVparam.onclickXvals.max = xBin;
		SVparam.onclickYvals.max = yBin;

		//make sure the mins and maxes go to the right place, in case the user dragged backwards:
		SVparam.XaxisLimitMin2D = Math.min(SVparam.onclickXvals.min, SVparam.onclickXvals.max);
		SVparam.XaxisLimitMax2D = Math.max(SVparam.onclickXvals.min, SVparam.onclickXvals.max);
		SVparam.YaxisLimitMin2D = Math.min(SVparam.onclickYvals.min, SVparam.onclickYvals.max);
		SVparam.YaxisLimitMax2D = Math.max(SVparam.onclickYvals.min, SVparam.onclickYvals.max);

		//redraw with new bounds:
		plot_data2D();
		SVparam.onclickXvals = {'min':-1, 'max':-1};
		SVparam.onclickYvals = {'min':-1, 'max':-1};
		return;

	} else if (y > (SVparam.canvas2D.height-SVparam.bottomMargin2D) && x > SVparam.leftMargin2D){ //release on the x-margin
		SVparam.clickX['up'] = xBin;
	} else if (x < SVparam.leftMargin2D && y < (SVparam.canvas2D.height-SVparam.bottomMargin2D)){ //release on the y-margin
		SVparam.clickY['up'] = yBin;
	} else if (x < SVparam.leftMargin2D && y > (SVparam.canvas2D.height-SVparam.bottomMargin2D)){ //release on the margin overlap
		SVparam.clickX['up'] = xBin;
		SVparam.clickY['up'] = yBin;
	}

	//valid X range found:
	if(SVparam.clickX.up != SVparam.clickX.down && SVparam.clickX.up>=0 && SVparam.clickX.down>=0){
		SVparam.XaxisLimitMin2D = Math.min(SVparam.clickX.up, SVparam.clickX.down);
		SVparam.XaxisLimitMax2D = Math.max(SVparam.clickX.up, SVparam.clickX.down);
		plot_data2D();
		SVparam.clickX.up = -1;
		SVparam.clickX.down = -1;
	} else if(SVparam.clickY.up != SVparam.clickY.down && SVparam.clickY.up>=0 && SVparam.clickY.down>=0){ //valid Y range found:
		SVparam.YaxisLimitMin2D = Math.min(SVparam.clickY.up, SVparam.clickY.down);
		SVparam.YaxisLimitMax2D = Math.max(SVparam.clickY.up, SVparam.clickY.down);
		plot_data2D();
		SVparam.clickY.up = -1;
		SVparam.clickY.down = -1;
	}
}

function mMove2D(event){
	var x, y, coords, xBin, yBin;

	if(SVparam.activeCursor)
		document.body.style.cursor = 'nwse-resize';
	else
		document.body.style.cursor = 'default'; 

	coords = document.getElementById(SVparam.canvasID2D).relMouseCoords(event);
	x = coords.x;
	y = coords.y;

	xBin = Math.floor((x-SVparam.leftMargin2D)/SVparam.binWidth2D+SVparam.XaxisLimitMin2D);
	yBin = Math.floor((SVparam.canvas2D.height-SVparam.bottomMargin2D-y)/SVparam.binHeight2D+SVparam.YaxisLimitMin2D);

	document.getElementById('2Dcoords').innerHTML = 'x: '+xBin+', y: '+yBin;

}

//draw a zaxis scale for the 2D plot:
function drawZscale(){
	var i, x0, y0, 
	width = SVparam.yAxisPixLength2D*0.08;
	length = SVparam.yAxisPixLength2D*0.9

	//top corner of scale:
	x0 = SVparam.leftMargin2D + SVparam.xAxisPixLength2D + SVparam.rightMargin2D;
	y0 = SVparam.topMargin2D;

	//color bar
	for(i=0; i<1000; i++){
		SVparam.context2D.fillStyle = scalepickr(i/1000, 'ROOT Rainbow');
		SVparam.context2D.fillRect(x0, SVparam.canvHeight2D - SVparam.bottomMargin2D - (SVparam.yAxisPixLength2D - length) - (i+1)*length/1000, width, length/1000);
	}

	//frame
	SVparam.context2D.strokeStyle = '#FFFFFF';
	SVparam.context2D.lineWidth = 1;
	SVparam.context2D.beginPath();
	SVparam.context2D.moveTo(x0+width, y0);
	SVparam.context2D.lineTo(x0+width, y0+length);
	SVparam.context2D.stroke();
	SVparam.context2D.closePath();
	for(i=0; i<5; i++){
		//ticks
		SVparam.context2D.beginPath();
		SVparam.context2D.moveTo(x0+width, SVparam.canvHeight2D - SVparam.bottomMargin2D - (SVparam.yAxisPixLength2D - length) - i*length/4);
		SVparam.context2D.lineTo(x0+width+SVparam.tickLength, SVparam.canvHeight2D - SVparam.bottomMargin2D - (SVparam.yAxisPixLength2D - length) - i*length/4);
		SVparam.context2D.stroke();
		SVparam.context2D.closePath();

		//labels
		SVparam.context2D.textBaseline = 'middle';
		SVparam.context2D.fillStyle = '#FFFFFF';
		if(!SVparam.logZ)
			label = (i*SVparam.zMax/4).toFixed(1);
		else
			label = (SVparam.logZmin + i/4*(SVparam.zMax - SVparam.logZmin)).toFixed(1);
		SVparam.context2D.fillText(label, x0+width+SVparam.tickLength + 5, SVparam.canvHeight2D - SVparam.bottomMargin2D - (SVparam.yAxisPixLength2D - length) - i*length/4)
	}
	SVparam.context2D.textBaseline = 'alphabetic';

	//title
	SVparam.context2D.save();
	SVparam.context2D.font = '20px Raleway'
	SVparam.context2D.translate(x0 + width + SVparam.tickLength + 2*SVparam.context2D.measureText(label).width, y0 + SVparam.yAxisPixLength2D/2 - SVparam.context2D.measureText('log(counts)').width/2)
	SVparam.context2D.rotate(Math.PI/2);
	SVparam.context2D.fillText('log ( counts )', 0,0);
	SVparam.context2D.restore();

	//legend:
	SVparam.context2D.fillRect(x0, y0+SVparam.yAxisPixLength2D-width, width, width);
	SVparam.context2D.strokeStyle = '#000000'
	SVparam.context2D.lineWidth = 2;
	SVparam.context2D.textBaseline = 'middle';
	SVparam.context2D.strokeRect(x0, y0+SVparam.yAxisPixLength2D-width, width, width);
	SVparam.context2D.fillText('Absent', x0+width+5, y0+SVparam.yAxisPixLength2D-width/2)

}

//Draw the gate boxes for use with the TBRAGG viewer:
function drawTbraggGates(){
	var i, x0, y0, size, height, width;

	if(document.getElementById('GateSize0')){
		for(i=0; i<TBparam.num_gates+1; i++){

			//in bins
			size = parseInt(document.getElementById('GateSize'+i).value);
			x0 = parseInt(document.getElementById('Gatex'+i).value) - size/2;
			y0 = parseInt(document.getElementById('Gatey'+i).value) + size/2;

			//in pixels
			height = size*SVparam.binHeight2D;
			width = size*SVparam.binWidth2D;
			x0 = SVparam.leftMargin2D + (x0 - SVparam.XaxisLimitMin2D)*SVparam.binWidth2D;
			y0 = SVparam.canvHeight2D - SVparam.bottomMargin2D - (y0 - SVparam.YaxisLimitMin2D)*SVparam.binHeight2D;

			//don't let the boxes go over the edge:
			//RHS:
			if(x0+width > SVparam.canvWidth2D-SVparam.rightMargin2D-SVparam.zScaleMargin && x0 < SVparam.canvWidth2D-SVparam.rightMargin2D-SVparam.zScaleMargin) 
				width = SVparam.canvWidth2D-SVparam.rightMargin2D-SVparam.zScaleMargin - x0;
			//LHS:
			if(x0 < SVparam.leftMargin2D && x0+width > SVparam.leftMargin2D){
				width -= SVparam.leftMargin2D - x0
				x0 = SVparam.leftMargin2D;
			} 
			//bottom:
			if(y0 + height > SVparam.canvHeight2D-SVparam.bottomMargin2D && y0 < SVparam.canvHeight2D-SVparam.bottomMargin2D) 
				height = SVparam.canvHeight2D-SVparam.bottomMargin2D - y0;
			//top:
			if(y0 < SVparam.topMargin2D && y0+height > SVparam.topMargin2D){
				height -= SVparam.topMargin2D - y0;
				y0 = SVparam.topMargin2D;
			}

			//draw
			if(x0+width > SVparam.leftMargin2D && x0 < SVparam.canvWidth2D-SVparam.rightMargin2D-SVparam.zScaleMargin && y0<SVparam.canvHeight2D-SVparam.bottomMargin2D && y0+height>SVparam.topMargin2D){
				SVparam.context2D.strokeStyle = TBparam.barChartColors[i+1];
				SVparam.context2D.lineWidth = 3;
				SVparam.context2D.strokeRect(x0,y0,width,height);
			}
		}
	}
}


//map [0,1] onto black->purple->red->orange->yellow->white
scalepickr = function(scale, palette){

    //map scale onto [0,360]:
    var H = scale*300 / 60;
    if(H>5) H=5;
    if(H<0) H=0;
    var R, G, B;
    var start0, start1, start2, start3, start4, start5;
    if (palette == 'Sunset'){
        start0 = [0,0,0];
        start1 = [0,0,0x52];
        start2 = [0xE6,0,0x5C];
        start3 = [255,255,0];        
        start4 = [255,0x66,0];
        start5 = [255,0,0];        
    } else if (palette == 'ROOT Rainbow'){

	 	//escape to white for unpopulated channels:
		if(scale=='unpopulated')
			return constructHexColor([255,255,255]);

        start0 = [0xFF,0x00,0x00];
        start1 = [0xFF,0xFF,0x00];
        start2 = [0x00,0xFF,0x00];
        start3 = [0x00,0xFF,0xFF];
        start4 = [0x00,0x00,0xFF];
        start5 = [0x66,0x00,0xCC];
        H = -1*(H-5);
    } else if (palette == 'Greyscale'){
        start0 = [0x00,0x00,0x00];
        start1 = [0x22,0x22,0x22];
        start2 = [0x55,0x55,0x55];
        start3 = [0x88,0x88,0x88];        
        start4 = [0xBB,0xBB,0xBB];
        start5 = [0xFF,0xFF,0xFF];
    } else if (palette == 'Red Scale'){
        start0 = [0x00,0x00,0x00];
        start1 = [0x33,0x00,0x00];
        start2 = [0x66,0x00,0x00];
        start3 = [0x99,0x00,0x00];
        start4 = [0xCC,0x00,0x00];
        start5 = [0xFF,0x00,0x00];
    } else if (palette == 'Mayfair'){
        start0 = [0x1E,0x4B,0x0F];
        start1 = [0x0E,0xBE,0x57];
        start2 = [0xE4,0xAB,0x33];
        start3 = [0xEC,0x95,0xF7];
        start4 = [0x86,0x19,0x4A];
        start5 = [0xFF,0x10,0x10];
    } else if (palette == 'Test'){
        start0 = [0x5E,0x1F,0x14];
        start1 = [0x74,0x4D,0x3E];
        start2 = [0x9D,0x47,0x05];
        start3 = [0xDF,0x67,0x19];
        start4 = [0xFE,0x83,0x54];
        start5 = [0x251,0x15,0x29];
    }
    if(H>=0 && H<1){
        R = start0[0] + Math.round(H*(start1[0]-start0[0]));
        G = start0[1] + Math.round(H*(start1[1]-start0[1]));
        B = start0[2] + Math.round(H*(start1[2]-start0[2]));
    } else if(H>=1 && H<2){
        R = start1[0] + Math.round((H-1)*(start2[0]-start1[0]));
        G = start1[1] + Math.round((H-1)*(start2[1]-start1[1]));
        B = start1[2] + Math.round((H-1)*(start2[2]-start1[2]));
    } else if(H>=2 && H<3){
        R = start2[0] + Math.round((H-2)*(start3[0]-start2[0]));
        G = start2[1] + Math.round((H-2)*(start3[1]-start2[1]));
        B = start2[2] + Math.round((H-2)*(start3[2]-start2[2]));
    } else if(H>=3 && H<4){
        R = start3[0] + Math.round((H-3)*(start4[0]-start3[0]));
        G = start3[1] + Math.round((H-3)*(start4[1]-start3[1]));
        B = start3[2] + Math.round((H-3)*(start4[2]-start3[2]));
    } else if(H>=4 && H<=5){
        R = start4[0] + Math.round((H-4)*(start5[0]-start4[0]));
        G = start4[1] + Math.round((H-4)*(start5[1]-start4[1]));
        B = start4[2] + Math.round((H-4)*(start5[2]-start4[2]));  
    }

    return constructHexColor([R,G,B]);

}

function constructHexColor(color){
    var R = Math.round(color[0]);
    var G = Math.round(color[1]);
    var B = Math.round(color[2]);

    R = R.toString(16);
    G = G.toString(16);
    B = B.toString(16);

    if(R.length == 1) R = '0'+R;
    if(G.length == 1) G = '0'+G;
    if(B.length == 1) B = '0'+B;

    return '#'+R+G+B;
}

function toggleMenu(divID){

	var totalHeight = parseInt(document.getElementById('menus').offsetHeight),  //total height of menu bar
		thisHeight = totalHeight*0.98 - 100,
		assocDiv, string;

	if(document.getElementById(divID).style.height == '50px'){ //expand menu:
		//change the title arrows as appropriate
		document.getElementById('arrow1D').innerHTML = String.fromCharCode(0x25B6);
		document.getElementById('arrow2D').innerHTML = String.fromCharCode(0x25B6);
		document.getElementById('arrowScope').innerHTML = String.fromCharCode(0x25B6);
		if(divID == 'menu1D') string = 'arrow1D';
		else if(divID == 'menu2D') string = 'arrow2D';
		else if(divID == 'scopeMenu') string = 'arrowScope';
		document.getElementById(string).innerHTML = String.fromCharCode(0x25BC);

		//shrink other menus and allow this one to fill the space:
		document.getElementById('menu1D').style.height = '50px';
		document.getElementById('menu2D').style.height = '50px';
		document.getElementById('scopeMenu').style.height = '50px';
		document.getElementById(divID).style.height = thisHeight+'px';

		//fade out other displays and send them to the back, and bring this one to the front.
		if(divID=='menu1D') assocDiv = 'spectrum1D';
		else if(divID=='menu2D') assocDiv = 'spectrum2D';
		else if(divID=='scopeMenu') assocDiv = 'scope';

		document.getElementById('spectrum1D').style['z-index'] = -1;
		document.getElementById('spectrum2D').style['z-index'] = -1;
		document.getElementById('scope').style['z-index'] = -1;
		document.getElementById('spectrum1D').style.opacity = 0;
		document.getElementById('spectrum2D').style.opacity = 0;
		document.getElementById('scope').style.opacity = 0;
		document.getElementById(assocDiv).style.opacity = 1;
		document.getElementById(assocDiv).style['z-index'] = 1

		if(divID == 'menu1D') document.getElementById('recent_list').style.display = 'table';
		else document.getElementById('recent_list').style.display = 'none';

	} else { //collapse menu:
		document.getElementById('arrow1D').innerHTML = String.fromCharCode(0x25B6);
		document.getElementById('arrow2D').innerHTML = String.fromCharCode(0x25B6);
		document.getElementById('arrowScope').innerHTML = String.fromCharCode(0x25B6);	
		document.getElementById(divID).style.height = '50px';
		document.getElementById('spectrum1D').style['z-index'] = -1;
		document.getElementById('spectrum2D').style['z-index'] = -1;
		document.getElementById('scope').style['z-index'] = -1;
		document.getElementById('spectrum1D').style.opacity = 0;
		document.getElementById('spectrum2D').style.opacity = 0;
		document.getElementById('scope').style.opacity = 0;
		document.getElementById('recent_list').style.display = 'none';
	}

}

//inject a bunch of canvases into a div.  Should pack in rows automatically.
function injectCanv(divID, nCanv){
	var div = document.getElementById(divID),
		width, height, style, i, newCanv;

	//how big should canvases be, in fraction of parent div dimensions?  Packing options are (row, col): (2,1), (2,2), (2,3), (3,3), (3,4), (4,4), (4,5), (4,6).
	width = '100%';
	height = '50%';
	if(nCanv>2){
		width = '50%';
		height = '50%';		
	}
	if(nCanv>4){
		width = '33.3%';
		height = '50%';		
	}
	if(nCanv>6){
		width = '33.3%';
		height = '33.3%';		
	}
	if(nCanv>9){
		width = '25%';
		height = '33.3%';		
	}
	if(nCanv>12){
		width = '25%';
		height = '25%';		
	}
	if(nCanv>16){
		width = '20%';
		height = '25%';		
	}
	if(nCanv>20){
		width = '16.6%';
		height = '25%';		
	}

	//construct style:
	style = 'width:'+width+'; height:'+height+'; float:left;';

	//inject canvases:
	for(i=0; i<Math.min(24,nCanv); i++){
		insertDOM('canvas', 'gridCanv'+i, '', style, divID);
	}

}

function toggleGridMode(){

	if(SVparam.gridMode){
		SVparam.gridMode = 0;
		document.getElementById('gridB').setAttribute('class', 'navLink');
		document.getElementById('overlayB').disabled = false;
	} else{
		SVparam.gridMode = 1;
		document.getElementById('gridB').setAttribute('class', 'navLinkDown');
		document.getElementById('overlayB').disabled = true;
	}
}

//insert something in the DOM
function insertDOM(element, id, classTag, style, wrapperID, onclick, content, name, type, value){
    var newElement = document.createElement(element);
    newElement.setAttribute('id', id);
    newElement.setAttribute('class', classTag);
    newElement.setAttribute('style', style);
    newElement.setAttribute('name', name);
    newElement.setAttribute('type', type);
    newElement.setAttribute('value', value);
    if(wrapperID == 'body')
        document.body.appendChild(newElement)
    else
        document.getElementById(wrapperID).appendChild(newElement);
    document.getElementById(id).innerHTML = content;
    document.getElementById(id).onclick = onclick;
}

// To do list:
// 
// General:
// - Reorder the specs list before displaying to handle mutliple selection better
// - include overlay functionality for points data OR REMOVE FUCNTIONALITY - removed for now
// - Reset function to make an array and subtract that from what we get from midas for zeroing spectra ie. spectrum not reset for all users
// - Comment entire code
//
// Cool extras:
// - data points get larger when zoomed in
// - Sleek buttons from images with mouseover effects
//
// 2D spectra:
// - Make a 2D menu load button
// - y axis zoomable with mouse and limit entry
// - 2D data array with each line as all y points of x

