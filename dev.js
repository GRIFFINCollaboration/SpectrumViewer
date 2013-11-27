function spectrumViewer(canvasID){

	//member variables//////////////////////////////////////////////

	//canvas & context
	this.canvasID = canvasID; //canvas ID
	this.canvas = document.getElementById(canvasID); //dom element pointer to canvas
	this.context = this.canvas.getContext('2d'); //context pointer

	//axes
	this.leftMargin = Math.max(50, this.canvas.width*0.05); //px
	this.rightMargin = 20; //px
	this.bottomMargin = 50; //px
	this.topMargin = 20; //px
	this.xAxisPixLength = this.canvas.width - this.leftMargin - this.rightMargin; //px
	this.yAxisPixLength = this.canvas.height - this.topMargin - this.bottomMargin; //px
	this.binWidth = 0; //px
	this.XaxisLimitMin = 0; //default min channel to show on x-axis
	this.XaxisLimitMax = 500; //default max channel to show on x-axis
	this.YaxisLimitMin = 0; //default min counts to show on y-axis
	this.YaxisLimitMax = 500; //default max counts to show on y-axis
	this.XaxisLimitAbsMax = 512; //highest maximum allowed on the x-axis
	this.XaxisLength = this.XaxisLimitMax-this.XaxisLimitMin; //length of x-axis in bins
	this.YaxisLength = this.YaxisLimitMax-this.YaxisLimitMin; //height of y-axis in counts
	this.maxYvalue = 500; //max y value - redundant with YaxisLimitMax?
	this.countHeight = 0; //height of one count
	this.axisColor = '#000000'; //color for axes
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
	this.fitted = false; //has the spectrum been fit since the last repaint?

	//plot repaint loop
	this.RefreshTime = 3; //seconds to wait before a plot refresh when requested
	this.refreshHandler = null; //pointer to the plot's setTimeout when a repaint is requested

	//member functions//////////////////////////////////////////////
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
			this.context.fillText(thisSpec + ': '+this.entries[thisSpec] + ' entries', this.canvas.width - this.rightMargin - this.context.measureText(thisSpec + ': '+this.entries[thisSpec] + 'entries').width, j*16);

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
				
				j++;
			}
			//finish the canvas path:
			this.context.lineTo(this.canvas.width - this.rightMargin, this.canvas.height - this.bottomMargin );
			this.context.closePath();
			this.context.stroke();

		} // End of for loop

		// Pause for some time and then recall this function to refresh the data display
		if(this.RefreshTime>0 && RefreshNow==1) this.refreshHandler = setTimeout(function(){plotData(1, 'true')},this.RefreshTime*1000); 
		
	};

	//initial setup///////////////////////////////////////
	this.drawFrame();
}