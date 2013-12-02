function spectrumViewer(canvasID){
	////////////////////////////////////////////////////////////////////////
	//member variables//////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////
	//canvas & context
	this.canvasID = canvasID; //canvas ID
	this.canvas = document.getElementById(canvasID); //dom element pointer to canvas
	this.canvas.style.backgroundColor = '#333333';
	this.context = this.canvas.getContext('2d'); //context pointer

	//axes
	this.fontScale = Math.min(Math.max(this.canvas.width / 50, 10), 16); // 10 < fontScale < 16
	this.context.font = this.fontScale + 'px Arial';
	this.leftMargin = Math.max(7*this.fontScale, this.canvas.width*0.05); //px
	this.rightMargin = 20; //px
	this.bottomMargin = 50; //px
	this.topMargin = 20; //px
	this.xAxisPixLength = this.canvas.width - this.leftMargin - this.rightMargin; //px
	this.yAxisPixLength = this.canvas.height - this.topMargin - this.bottomMargin; //px
	this.binWidth = 0; //px
	this.XaxisLimitMin = 0; //default min channel to show on x-axis
	this.XaxisLimitMax = 2048; //default max channel to show on x-axis
	this.YaxisLimitMin = 0; //default min counts to show on y-axis
	this.YaxisLimitMax = 500; //default max counts to show on y-axis
	this.XaxisLimitAbsMax = 512; //highest maximum allowed on the x-axis
	this.XaxisLength = this.XaxisLimitMax-this.XaxisLimitMin; //length of x-axis in bins
	this.YaxisLength = this.YaxisLimitMax-this.YaxisLimitMin; //height of y-axis in counts
	this.maxYvalue = 500; //max y value - redundant with YaxisLimitMax?
	this.countHeight = 0; //height of one count
	this.axisColor = '#999999'; //color for axes
	this.axisLineWidth = 1; //weight of axis lines in px
	this.nXticks = 6; //default number of ticks on the x axis
	this.nYticks = 5; //default number of ticks on the y axis
	this.tickLength = 5; //default tick length in px
	this.xLabelOffset = 5; //default x label offset in px
	this.yLabelOffset = 5; //default y label offset in px
	this.AxisType = 0; //0 == linear, 1 == log
	this.baseFont = '16px Arial'; //default base font
	this.expFont = '12px Arial'; //default font for exponents
	this.xAxisTitle = 'Channels'; //default x-axis title
	this.yAxisTitle = 'Counts'; //default y-axis title

	//data
	this.dataBuffer = {}; //buffer holding all the specta we've downloaded, as 'name':data[], 
						  //where data[i] = counts in channel i
	this.plotBuffer = {}; //same as dataBuffer, but only the plots we're displaying presently.
	this.fakeData = {};
	this.fakeData.energydata0 = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	this.entries = {}; //number of entries in each displayed spectrum
	this.dataColor = ["#FFFFFF", "#FF0000", "#00FFFF", "#44FF44", "#FF9900", "#0066FF", "#FFFF00", "#FF00CC", "#00CC00", "#994499"]; //colors to draw each plot line with

	//fitting
	this.fitTarget = null //id of the spectrum to fit to
	this.fitted = false; //has the spectrum been fit since the last repaint?
	this.fitModeEngage = false; //are we currently fitting the spectrum?
	this.FitLimitLower = -1; //fitting limits
	this.FitLimitUpper = -1;
	this.fitCallback = function(){}; //callback to run after fitting, arguments are (center, width)

    //cursors
    this.cursorX = 0; //x-bin of cursor
    this.cursorY = 0; //y-bin of cursor
    this.mouseMoveCallback = function(){}; //callback on moving the cursor over the plot, arguments are (x-bin, y-bin)

    //click interactions
    this.XMouseLimitxMin = 0; //limits selected with the cursor
    this.XMouseLimitxMax = 0;
    this.clickBounds = [];

	//plot repaint loop
	this.RefreshTime = 3; //seconds to wait before a plot refresh when requested
	this.refreshHandler = null; //pointer to the plot's setTimeout when a repaint is requested

	////////////////////////////////////////////////////////////////
	//member functions//////////////////////////////////////////////
	////////////////////////////////////////////////////////////////
	//draw the plot frame
	this.drawFrame = function(){
		var binsPerTick, countsPerTick, i, label;

		//determine bin render width
		this.binWidth = this.xAxisPixLength / (this.XaxisLimitMax - this.XaxisLimitMin);
		//determine the scale render height per count for linear view:
		this.countHeight = this.yAxisPixLength / this.YaxisLength;

		//clear canvas
		this.context.clearRect(0,0,this.canvas.width, this.canvas.height);

		//draw principle axes:
		this.context.strokeStyle = this.axisColor;
		this.context.fillStyle = this.axisColor;
		this.context.lineWidth = this.axisLineWidth;
		this.context.beginPath();
		this.context.moveTo(this.leftMargin, this.topMargin);
		this.context.lineTo(this.leftMargin, this.canvas.height-this.bottomMargin);
		this.context.lineTo(this.canvas.width - this.rightMargin, this.canvas.height - this.bottomMargin);
		this.context.stroke();

		//Decorate x axis////////////////////////////////////////////////////////
		//decide how many ticks to draw on the x axis; come as close to a factor of the number of bins as possible:
		while( Math.floor(this.XaxisLength / this.nXticks) == Math.floor(this.XaxisLength / (this.nXticks-1)) )
			this.nXticks--;
		//draw at most one tick per bin:
		if(this.XaxisLength < (this.nXticks-1) )
			this.nXticks = this.XaxisLength+1;

		//how many bins should there be between each tick?
		binsPerTick = Math.floor((this.XaxisLimitMax - this.XaxisLimitMin) / (this.nXticks-1));

		//draw x axis ticks & labels:
		for(i=0; i<this.nXticks; i++){
			//ticks
			this.context.beginPath();
			this.context.moveTo(this.leftMargin + i*binsPerTick*this.binWidth, this.canvas.height - this.bottomMargin);
			this.context.lineTo(this.leftMargin + i*binsPerTick*this.binWidth, this.canvas.height - this.bottomMargin + this.tickLength);
			this.context.stroke();

			//labels
			label = (this.XaxisLimitMin + i*binsPerTick).toFixed(0);
			this.context.textBaseline = 'top';
			this.context.fillText(label, this.leftMargin + i*binsPerTick*this.binWidth - this.context.measureText(label).width/2, this.canvas.height - this.bottomMargin + this.tickLength + this.xLabelOffset);
		}

		//Decorate Y axis/////////////////////////////////////////////////////////
		//decide how many ticks to draw on the y axis; come as close to a factor of the number of bins as possible:
		while( Math.floor(this.YaxisLength / this.nYticks) == Math.floor(this.YaxisLength / (this.nYticks-1)) )
			this.nYticks--;

		//how many counts should each tick increment?
		countsPerTick = Math.floor(this.YaxisLength / (this.nYticks-1));

		//draw y axis ticks and labels:
		for(i=0; i<this.nYticks; i++){
			//ticks
			this.context.beginPath();
			this.context.moveTo(this.leftMargin, this.canvas.height - this.bottomMargin - i*countsPerTick*this.countHeight);
			this.context.lineTo(this.leftMargin - this.tickLength, this.canvas.height - this.bottomMargin - i*countsPerTick*this.countHeight);
			this.context.stroke();

			//labels
			this.context.textBaseline = 'middle';
			if(this.AxisType == 0){ //linear scale
				label = (this.YaxisLimitMax<10000) ? (i*countsPerTick).toFixed(0) : (i*countsPerTick).toExponential(1);
				this.context.fillText(label, this.leftMargin - this.tickLength - this.yLabelOffset - this.context.measureText(label).width, this.canvas.height - this.bottomMargin - i*countsPerTick*this.countHeight);
			} else {  //log scale
				label = i*countsPerTick-1;
				//exponent
				this.context.font = this.expFont;
				this.context.fillText(label, this.leftMargin - this.tickLength - this.yLabelOffset - this.context.measureText(label).width, this.canvas.height - this.bottomMargin - i*countsPerTick*this.countHeight - 10);
				//base
				this.context.font = this.baseFont;
				this.context.fillText('10', this.leftMargin - this.tickLength - this.yLabelOffset - this.context.measureText('10'+label).width, this.canvas.height - this.bottomMargin - i*countsPerTick*this.countHeight);
			}
		}

		//x axis title:
		this.context.textBaseline = 'bottom';
		this.context.fillText(this.xAxisTitle, this.canvas.width - this.rightMargin - this.context.measureText(this.xAxisTitle).width, this.canvas.height);

		//y axis title:
		this.context.textBaseline = 'alphabetic';
		this.context.save();
		this.context.translate(this.leftMargin*0.25, this.context.measureText(this.yAxisTitle).width + this.topMargin );
		this.context.rotate(-Math.PI/2);
		this.context.fillText(this.yAxisTitle, 0,0);
		this.context.restore();
	};

	//update the plot
	this.plotData = function(RefreshNow){
		var i, j, data, thisSpec, totalEntries,
		thisData = [];
		this.entries = {};
		
		this.YaxisLimitMax=5;
		this.XaxisLength = this.XaxisLimitMax - this.XaxisLimitMin;

		//abandon the fit when re-drawing the plot
		this.fitted = false;

		this.maxYvalue=this.YaxisLimitMax;
		// Loop through to get the data and set the Y axis limits
		for(thisSpec in this.plotBuffer){
			//Find the maximum X value from the size of the data
			if(this.plotBuffer[thisSpec].length>this.XaxisLimitAbsMax){
				this.XaxisLimitAbsMax=this.plotBuffer[thisSpec].length;
			}

			// Find maximum Y value in the part of the spectrum to be displayed
			if(Math.max.apply(Math, this.plotBuffer[thisSpec].slice(Math.floor(this.XaxisLimitMin),Math.floor(this.XaxisLimitMax)))>this.maxYvalue){
				this.maxYvalue=Math.max.apply(Math, this.plotBuffer[thisSpec].slice(Math.floor(this.XaxisLimitMin),Math.floor(this.XaxisLimitMax)));
			}

			// Find the sum of everything in the current x range
			data = this.plotBuffer[thisSpec].slice(  Math.floor(this.XaxisLimitMin),Math.floor(this.XaxisLimitMax)   );
			totalEntries = 0;
			for(j=0; j<data.length; j++ ){
				totalEntries += data[j];
			}

			//report number of entries on canvas:
			this.entries[thisSpec] = totalEntries;

		}// End of for loop

		// Adjust the Y axis limit and compression and redraw the axis
		if(this.maxYvalue>5){
			if(this.AxisType==0) this.YaxisLimitMax=Math.floor(this.maxYvalue*1);
			if(this.AxisType==1) this.YaxisLimitMax=this.maxYvalue*10;
		} else {
			if(this.AxisType==0) this.YaxisLimitMax=5;
			if(this.AxisType==1) this.YaxisLimitMax=50;
		}

		if(this.AxisType==0)
			this.YaxisLength = this.YaxisLimitMax-this.YaxisLimitMin;

		if(this.AxisType==1)
			this.YaxisLength=Math.log10(this.YaxisLimitMax-this.YaxisLimitMin);

		this.drawFrame();

		// Now the limits are set loop through and plot the data points
		j = 0; //j counts plots in the drawing loop
		for(thisSpec in this.plotBuffer){
			this.context.textBaseline = 'top';
			this.context.fillStyle = this.dataColor[j];
			this.context.fillText(thisSpec + ': '+this.entries[thisSpec] + ' entries', this.canvas.width - this.rightMargin - this.context.measureText(thisSpec + ': '+this.entries[thisSpec] + 'entries').width, j*this.fontScale);

			//SVparam.data=thisData[thisSpec].slice();

			// Loop through the data spectrum that we have
			//start the canvas path:
			this.context.strokeStyle = this.dataColor[j];
			this.context.beginPath();
			this.context.moveTo(this.leftMargin, this.canvas.height - this.bottomMargin);
			for(i=Math.floor(this.XaxisLimitMin); i<Math.floor(this.XaxisLimitMax); i++){

				// Protection at the end of the spectrum (minimum and maximum X)
				if(i<this.XaxisLimitMin || i>this.XaxisLimitMax) continue;

				// Protection in Overlay mode for spectra which are shorter (in x) than the longest spectrum overlayed.
				if(i>=this.plotBuffer[thisSpec].length) continue;

				if(this.AxisType==0){
					//draw canvas line:
					//left side of bar
					this.context.lineTo( this.leftMargin + (i-this.XaxisLimitMin)*this.binWidth, this.canvas.height - this.bottomMargin - this.plotBuffer[thisSpec][i]*this.countHeight );
					//top of bar
					this.context.lineTo( this.leftMargin + (i+1-this.XaxisLimitMin)*this.binWidth, this.canvas.height - this.bottomMargin - this.plotBuffer[thisSpec][i]*this.countHeight );
				}

				if(this.AxisType==1){
					//draw canvas line:
					if(this.plotBuffer[thisSpec][i] > 0){
						//left side of bar
						this.context.lineTo( this.leftMargin + (i-this.XaxisLimitMin)*this.binWidth, this.canvas.height - this.bottomMargin - (Math.log10(this.plotBuffer[thisSpec][i]) - Math.log10(this.YaxisLimitMin))*this.countHeight );
						//top of bar
						this.context.lineTo( this.leftMargin + (i+1-this.XaxisLimitMin)*this.binWidth, this.canvas.height - this.bottomMargin - (Math.log10(this.plotBuffer[thisSpec][i]) - Math.log10(this.YaxisLimitMin))*this.countHeight );
					} else {
						//drop to the x axis
						this.context.lineTo( this.leftMargin + (i-this.XaxisLimitMin)*this.binWidth, this.canvas.height - this.bottomMargin );
						//crawl along x axis until log-able data is found:
						this.context.lineTo( this.leftMargin + (i+1-this.XaxisLimitMin)*this.binWidth, this.canvas.height - this.bottomMargin );
					}
				}
			}
			//finish the canvas path:
			this.context.lineTo(this.canvas.width - this.rightMargin, this.canvas.height - this.bottomMargin );
			//this.context.closePath();
			this.context.stroke();
			j++;
		} // End of for loop

		// Pause for some time and then recall this function to refresh the data display
		if(this.RefreshTime>0 && RefreshNow==1) this.refreshHandler = setTimeout(function(){plotData(1, 'true')},this.RefreshTime*1000); 	
	};

	//handle drag-to-zoom on the plot
	this.DragWindow = function(){
		var buffer;

		//don't even try if there's only one bin selected:
		if(this.XMouseLimitxMin != this.XMouseLimitxMax){
			//don't confuse the click limits with the click and drag limits:
			this.clickBounds[0] = 'abort';

			//Make sure the max is actually the max:
			if(this.XMouseLimitxMax < this.XMouseLimitxMin){
				buffer = this.XMouseLimitxMax;
				this.XMouseLimitxMax = this.XMouseLimitxMin;
				this.XMouseLimitxMin = buffer;
			}

			//keep things in range
			if(this.XMouseLimitxMin < 0) this.XMouseLimitxMin = 0;
			if(this.XMouseLimitxMax > this.XaxisLimitAbsMax) this.XMouseLimitxMax = this.XaxisLimitAbsMax;

			//stick into the appropriate globals
			this.XaxisLimitMin = parseInt(this.XMouseLimitxMin);
			this.XaxisLimitMax = parseInt(this.XMouseLimitxMax);
	
			//TBD: delete?
			//programatically trigger the fields' onchange:
			//document.getElementById('LowerXLimit').onchange();
			//document.getElementById('UpperXLimit').onchange();

			//drawXaxis();
			this.YaxisLimitMax=5;

			this.plotData();

		}
	};

	//handle clicks on the plot
	this.ClickWindow = function(bin){

		//decide what to do with the clicked limits - zoom or fit?
		if(this.clickBounds.length == 0){
			this.clickBounds[0] = bin;
		} else if(this.clickBounds[0] == 'abort' && !this.fitModeEngage){
			this.clickBounds = [];
		} else if(this.clickBounds.length == 2 ){
			this.clickBounds = [];
			this.clickBounds[0] = bin;
		} else if(this.clickBounds.length == 1){
			this.clickBounds[1] = bin;
			//fit mode
			if(this.fitModeEngage){
				this.FitLimitLower = Math.min(this.clickBounds[0], this.clickBounds[1]);
				this.FitLimitUpper = Math.max(this.clickBounds[0], this.clickBounds[1]);
				this.fitData(this.fitTarget);
			} else {  //zoom mode
				//use the mouse drag function to achieve the same effect for clicking:
				this.XMouseLimitxMin = this.clickBounds[0];
				this.XMouseLimitxMax = this.clickBounds[1];
				this.DragWindow();
				this.clickBounds = [];
			}
		}
	};

	//scroll the plot x-window by x to the right
	this.scrollSpectra = function(step){
		var windowSize = this.XaxisLimitMax - this.XaxisLimitMin;

		this.XaxisLimitMin += step;
		this.XaxisLimitMax += step;

		if(this.XaxisLimitMin < 0){
			this.XaxisLimitMin = 0;
			this.XaxisLimitMax = windowSize;
		}

		if(this.XaxisLimitMax > this.XaxisLimitAbsMax){
			this.XaxisLimitMax = this.XaxisLimitAbsMax;
			this.XaxisLimitMin = this.XaxisLimitMax - windowSize;
		}

		this.plotData();

		//TBD: callbacks?
	};

	//zoom out to the full x-range
	this.unzoom = function(){

		this.XaxisLimitMin = 0;
		this.XaxisLimitMax = this.XaxisLimitAbsMax;
		this.plotData();

/*TBD: callback?
		//1D
		if(document.getElementById('LowerXLimit')){
			SVparam.XaxisLimitMin=0;
			SVparam.XaxisLimitMax=SVparam.XaxisLimitAbsMax;

			//update input field values and trigger their onchange:
			document.getElementById("LowerXLimit").value=SVparam.XaxisLimitMin;
			document.getElementById("UpperXLimit").value=SVparam.XaxisLimitMax;
			document.getElementById('LowerXLimit').onchange();
			document.getElementById('UpperXLimit').onchange();

			plotData();
		}
		*/
	};

	//set the axis to 'linear' or 'log', and repaint
	this.setAxisType = function(type){
		if(type=='log') this.AxisType = 1;
		else this.AxisType = 0;
		plotData();
	};

	//set up for fit mode, replaces old requestfitlimits
	this.setupFitMode = function(){
		this.fitModeEngage = 1;
		this.FitLimitLower=-1;
		this.FitLimitUpper=-1;		
	};

	//stick a gaussian on top of the spectrum fitKey between the fit limits
	this.fitData = function(fitKey){
		var cent, fitdata, i, max, width, x, y, height;

		//suspend the refresh
		window.clearTimeout(this.refreshHandler);

		if(this.FitLimitLower<0) this.FitLimitLower=0;
		if(this.FitLimitUpper>this.XaxisLimitAbsMax) this.FitLimitUpper = this.XaxisLimitAbsMax;

		max=1;

		fitdata=this.plotBuffer[fitKey];
		fitdata=fitdata.slice(this.FitLimitLower, this.FitLimitUpper);

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

		cent=cent+this.FitLimitLower+0.5;

		//set up canvas for drawing fit line
		this.context.lineWidth = 3;
		this.context.strokeStyle = '#FF0000';
		this.context.beginPath();
		this.context.moveTo( this.leftMargin + (this.FitLimitLower-this.XaxisLimitMin)*this.binWidth, this.canvas.height - this.bottomMargin - max*Math.exp(-1*(((this.FitLimitLower-cent)*(this.FitLimitLower-cent))/(2*width*width)))*this.countHeight);

		for(i=0;i<fitdata.length;i+=0.2){
			//draw fit line on canvas:
			x=i+this.FitLimitLower;
			y = max*Math.exp(-1*(((x-cent)*(x-cent))/(2*width*width)));
			if(i!=0){
				if(this.AxisType == 0){
					this.context.lineTo( this.leftMargin + (this.FitLimitLower-this.XaxisLimitMin)*this.binWidth + i*this.binWidth, this.canvas.height - this.bottomMargin - y*this.countHeight);
				} else if(this.AxisType == 1){
					if(y<=0) height = 0;
					else height = Math.log10(y) - Math.log10(this.YaxisLimitMin);
					if(height<0) height = 0;

					this.context.lineTo( this.leftMargin + (this.FitLimitLower-this.XaxisLimitMin)*this.binWidth + i*this.binWidth, this.canvas.height - this.bottomMargin - height*this.countHeight);
				}
			}
		}

		this.context.stroke();

		/* TODO: probably replace this with a callback
		SVparam.word = 'Height = ' + max + ' Width = ' + width.toFixed(3) + ' Centroid = ' + cent;
		document.getElementById('fitbox').innerHTML = SVparam.word;
		SVparam.word = 'H=' + max + ',W=' + width.toFixed(3) + ',C=' + cent + "; ";
		document.getElementById('spec_fits0').innerHTML = SVparam.word+document.getElementById('spec_fits0').innerHTML;
		*/

		this.fitted=1;
		this.fitModeEngage = 0;

		this.fitCallback(cent, width);
	};

	//////////////////////////////////////////////////////
	//initial setup///////////////////////////////////////
	//////////////////////////////////////////////////////
	this.drawFrame();
	//plot mouseover behavior - report mouse coordinates in bin-space, and manage the cursor style
	this.canvas.addEventListener('mousemove', function(event){
		var coords, x, y, xBin, yBin;

		coords = this.canvas.relMouseCoords(event);
		x = coords.x;
		y = coords.y;

        if(x > this.leftMargin && x < this.canvas.width - this.rightMargin && y > this.topMargin){
	        xBin = Math.floor((x-this.leftMargin)/this.binWidth) + this.XaxisLimitMin;
    	    
    	    if(this.AxisType == 1){
    	    	yBin = (this.canvas.height-this.bottomMargin - y) / this.countHeight;
    	    	yBin = Math.floor(Math.pow(10,yBin)/10);
    	    } else {
    	    	yBin = Math.floor((this.canvas.height-this.bottomMargin - y) / this.countHeight);
    	    }

    	    this.cursorX = xBin.toFixed(0);
    	    this.cursorY = yBin.toFixed(0);
        }
        this.mouseMoveCallback(xBin, yBin);

        //change cursor to indicate draggable region:
        if(this.fitModeEngage){
        	if( y < (this.canvas.height - this.bottomMargin) )
	        	document.body.style.cursor = 's-resize';
	        else 
	        	document.body.style.cursor = 'n-resize';
	    }
        else if(y>this.canvas.height-this.bottomMargin) 
        	document.body.style.cursor = 'pointer';
        else
        	document.body.style.cursor = 'default';
	}.bind(this), false);

	this.canvas.onmouseout = function(event){
		document.body.style.cursor = 'default';
	};

	this.canvas.onmousedown = function(event){
		this.XMouseLimitxMin = parseInt((this.canvas.relMouseCoords(event).x-this.leftMargin)/this.binWidth + this.XaxisLimitMin);
	}.bind(this);

	this.canvas.onmouseup = function(event){
			this.XMouseLimitxMax = parseInt((this.canvas.relMouseCoords(event).x-this.leftMargin)/this.binWidth + this.XaxisLimitMin); 
			this.DragWindow();
			this.ClickWindow( parseInt((this.canvas.relMouseCoords(event).x-this.leftMargin)/this.binWidth + this.XaxisLimitMin) );
	}.bind(this);
}

//stick a coordinate tracker on the canvas prototype:
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

//tell the Math library about log base 10:
Math.log10 = function(n) {
	return (Math.log(n)) / (Math.log(10));
}