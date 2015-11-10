xtag.register('x-gain-match-report', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('gainMatchReport').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {
                        'id': this.id,
                        'detectors': dataStore.GRIFFINdetectors
                    });
                }.bind(this)
            ).then(
                function(){
                    if(typeof templateCallback === "function")
                        templateCallback();
                }.bind(this)
            )
        }
    },

    methods:{
        configure: function(){
            //plug in fit all button
            document.getElementById(this.id + 'fitAll').onclick = this.fitAll.bind(this);

            //plug in source dropdown
            document.getElementById(this.id + 'calibrationSource').onchange = this.updateEnergies.bind(this);
            //plug in peak energy inputs
            document.getElementById(this.id + 'peak1').onchange = this.customEnergy.bind(this);
            document.getElementById(this.id + 'peak2').onchange = this.customEnergy.bind(this);

            //set up fit callbacks
            dataStore.viewers[dataStore.plots[0]].fitCallback = this.fitCallback.bind(this);
        },

        fitAll: function(){
            //fit all spectra to the peaks defined.
            //this: x-gain-match-report object

            var i, keys = Object.keys(dataStore.rawData);

            releaser(
                function(i){
                    var keys = Object.keys(dataStore.rawData);
                    this.fitSpectra(keys[i])
                    document.getElementById(this.id + 'progress').setAttribute('style', 'width:' + (100*(keys.length - i) / keys.length) + '%' )   
                }.bind(this),

                function(){
                    var evt;
                    //set up fit line re-drawing
                    dataStore.viewers[dataStore.plots[0]].drawCallback = this.addFitLines;

                    //leave the viewer pointing at the first spectrum for fitting
                    dispatcher({}, dataStore.fitAllCompleteListeners, 'fitAllComplete')

                }.bind(this),

                keys.length-1
            )
        },

        fitSpectra: function(spectrum){
            //redo the fits for the named spectrum.
            //<spectrum>: string; name of spectrum, per names from analyzer
            //this: x-gain-match-report object

            var viewerName = dataStore.plots[0];

            //identify regions of interest
            this.guessPeaks(spectrum, dataStore.rawData[spectrum]);

            //set up fitting
            dataStore.viewers[viewerName].addData(spectrum, JSON.parse(JSON.stringify(dataStore.rawData[spectrum])) );
            dataStore.currentPlot = spectrum;
            dataStore.viewers[viewerName].plotData() //kludge to update limits, could be nicer
            dataStore.viewers[viewerName].fitTarget = spectrum;

            //first peak
            dataStore.currentPeak = 0
            dataStore.viewers[viewerName].FitLimitLower = dataStore.ROI[spectrum].ROIlower[0]
            dataStore.viewers[viewerName].FitLimitUpper = dataStore.ROI[spectrum].ROIlower[1]
            dataStore.viewers[viewerName].fitData(spectrum, 0);
            
            //second peak
            dataStore.currentPeak = 1
            dataStore.viewers[viewerName].FitLimitLower = dataStore.ROI[spectrum].ROIupper[0]
            dataStore.viewers[viewerName].FitLimitUpper = dataStore.ROI[spectrum].ROIupper[1]
            dataStore.viewers[viewerName].fitData(spectrum, 0);
            
            //dump data so it doesn't stack up 
            dataStore.viewers[viewerName].removeData(spectrum);        
        },

        addFitLines: function(){
            //add current fits to the plot

            var lower, upper,
                viewerName = dataStore.plots[0];

            dataStore.viewers[viewerName].containerFit.removeAllChildren();

            //add fit lines
            lower = dataStore.viewers[viewerName].addFitLine(
                        dataStore.ROI[dataStore.currentPlot].ROIlower[0], 
                        dataStore.ROI[dataStore.currentPlot].ROIlower[1] - dataStore.ROI[dataStore.currentPlot].ROIlower[0], 
                        dataStore.fitResults[dataStore.currentPlot][0][0], 
                        dataStore.fitResults[dataStore.currentPlot][0][1], 
                        dataStore.fitResults[dataStore.currentPlot][0][2], 
                        dataStore.fitResults[dataStore.currentPlot][0][3], 
                        dataStore.fitResults[dataStore.currentPlot][0][4]
                    );

            upper = dataStore.viewers[viewerName].addFitLine(
                        dataStore.ROI[dataStore.currentPlot].ROIupper[0], 
                        dataStore.ROI[dataStore.currentPlot].ROIupper[1] - dataStore.ROI[dataStore.currentPlot].ROIupper[0], 
                        dataStore.fitResults[dataStore.currentPlot][1][0], 
                        dataStore.fitResults[dataStore.currentPlot][1][1], 
                        dataStore.fitResults[dataStore.currentPlot][1][2], 
                        dataStore.fitResults[dataStore.currentPlot][1][3], 
                        dataStore.fitResults[dataStore.currentPlot][1][4]
                    );
            dataStore.viewers[viewerName].containerFit.addChild(lower)
            dataStore.viewers[viewerName].containerFit.addChild(upper)

            dataStore.viewers[viewerName].stage.update();
        },

        guessPeaks: function(spectrumName, data){
            //given a spectrum <data>, identify the bins corresponding to the maxima of the two largest peaks
            //around where we expect the calibration peaks to fall (+- 30 bins of bin==peak energy in kev)
            //register a range around those peaks as our automated guesses for where the gammas of interest lie.
            //<spectrumName>: string; name of spectrum, per names from analyzer
            //<data>: array; bin contents for a spectrum, array index == bin number.
            //this: x-gain-match-report object

            var i, max, center, ROIlower, ROIupper, buffer,
            dataCopy = JSON.parse(JSON.stringify(data)),
            ROIwidth = 5;
            searchWidth = 30;
            var lowEnergy = parseInt(document.getElementById(this.id + 'peak1').value,10);
            var highEnergy = parseInt(document.getElementById(this.id + 'peak2').value,10);

            max = Math.max.apply(Math, dataCopy.slice(lowEnergy - searchWidth, lowEnergy + searchWidth));
            center = dataCopy.slice(lowEnergy - searchWidth, lowEnergy + searchWidth).indexOf(max) + lowEnergy - searchWidth;
            ROIlower = [center - ROIwidth, center + ROIwidth];

            //mask out this peak so we can find the next biggest
            for(i=center-ROIwidth; i<=center+ROIwidth; i++){
                dataCopy[i] = 0
            }

            max = Math.max.apply(Math, dataCopy.slice(highEnergy - searchWidth, highEnergy + searchWidth));
            center = dataCopy.slice(highEnergy - searchWidth, highEnergy + searchWidth).indexOf(max) + highEnergy - searchWidth;
            ROIupper = [center - ROIwidth, center + ROIwidth];

            //make sure lower contains the lower energy peak (currently contains the highest intensity peak)
            if(ROIlower[0] > ROIupper[0]){
                buffer = JSON.parse(JSON.stringify(ROIlower));
                ROIlower = JSON.parse(JSON.stringify(ROIupper));
                ROIupper = JSON.parse(JSON.stringify(buffer));
            }

            dataStore.ROI[spectrumName] = {
                "ROIlower": ROIlower,
                "ROIupper": ROIupper
            }

        },

        fitCallback: function(center, width, amplitude, intercept, slope){
            //after fitting, log the fit results, as well as any modification made to the ROI by the fitting algortihm
            //also update table
            //<center>: number; center of gaussian peak
            //<width>: number; width of peak
            //<amplitude>: number; amplitude of peak
            //<intercept>: number; intercept of linear background beneath peak
            //<slope>: number; slope of linear background
            //this: x-gain-match-report object

            var lowPeak = document.getElementById('fitLow');
            var highPeak = document.getElementById('fitHigh');
            var viewerName = dataStore.plots[0];


            if(!dataStore.fitResults[dataStore.currentPlot])
                dataStore.fitResults[dataStore.currentPlot] = [];

            //keep track of fit results
            dataStore.fitResults[dataStore.currentPlot][dataStore.currentPeak] = [amplitude, center, width, intercept, slope]

            //convenient to arrange resolution data here
            if(dataStore.currentPeak == 0)
                dataStore.lowPeakResolution[dataStore.GRIFFINdetectors.indexOf(dataStore.currentPlot.slice(0,10))] = width;
            else if(dataStore.currentPeak == 1)
                dataStore.highPeakResolution[dataStore.GRIFFINdetectors.indexOf(dataStore.currentPlot.slice(0,10))] = width;

            if(dataStore.currentPeak == 0){
                dataStore.ROI[dataStore.currentPlot].ROIlower[0] = dataStore.viewers[viewerName].FitLimitLower;
                dataStore.ROI[dataStore.currentPlot].ROIlower[1] = dataStore.viewers[viewerName].FitLimitUpper;
            } else {
                dataStore.ROI[dataStore.currentPlot].ROIupper[0] = dataStore.viewers[viewerName].FitLimitLower;
                dataStore.ROI[dataStore.currentPlot].ROIupper[1] = dataStore.viewers[viewerName].FitLimitUpper;
            }

            //update table
            this.updateTable(dataStore.currentPlot);
            this.whatsNormal();
            this.highlightOutliers();

            //update plot
            //dataStore.viewers[dataStore.plots[0]].plotData();

            //update resolution plot
            this.reconstructResolutionData()

            //disengage fit mode buttons
            if( parseInt(lowPeak.getAttribute('engaged'),10) == 1)
                lowPeak.onclick();
            if( parseInt(highPeak.getAttribute('engaged'),10) == 1)
                highPeak.onclick();

        },

        updateTable: function(spectrum){
            //update the report table with whatever is currently in the dataStore
            //recall dataStore.fitReults[plotTitle] = [[amplitude, center, width, slope, intercept],[...]], for [low energy, high energy].
            //<spectrumName>: string; name of spectrum, per names from analyzer
            //this: x-gain-match-report object

            var calibration

            if(Array.isArray(dataStore.fitResults[spectrum][0]))
                document.getElementById(this.id + spectrum.slice(0,10) + 'chan1').innerHTML = dataStore.fitResults[spectrum][0][1].toFixed(3);
            if(Array.isArray(dataStore.fitResults[spectrum][1]))
                document.getElementById(this.id + spectrum.slice(0,10) + 'chan2').innerHTML = dataStore.fitResults[spectrum][1][1].toFixed(3);

            if(Array.isArray(dataStore.fitResults[spectrum][0]) && Array.isArray(dataStore.fitResults[spectrum][1])){
                calibration = this.calculateLine(dataStore.fitResults[spectrum][0][1], dataStore.fitResults[spectrum][1][1]);
                document.getElementById(this.id + spectrum.slice(0,10) + 'intercept').innerHTML = calibration[0].toFixed(3);
                document.getElementById(this.id + spectrum.slice(0,10) + 'slope').innerHTML = calibration[1].toFixed(3);
                dataStore.fitResults[spectrum][2] = calibration
            }
        },

        calculateLine: function(lowBin, highBin){
            //given the positions of the low bin and high bin, return [intercept, slope] defining
            //a striaght calibration line using the energies reported in the input.
            //lowBin: number; center of low energy peak in bins
            //highBin: number; center of high energy peak in bins
            //this: x-gain-match-report object

            var lowEnergy = document.getElementById(this.id + 'peak1').value
            var highEnergy = document.getElementById(this.id + 'peak2').value
            var slope, intercept;

            slope = (lowEnergy - highEnergy) / (lowBin - highBin);
            intercept = lowEnergy - slope*lowBin

            return [intercept, slope]

        },

        whatsNormal: function(){
            //identifies the mean and SD of the fit peak position across all detectors for both claibration peaks

            var i, mean = [0,0], mean2 = [0,0], sd;
            var keys = Object.keys(dataStore.fitResults);
            var numFirst = 0, numSecond = 0

            for(i=0; i<keys.length; i++){
                if(dataStore.fitResults[keys[i]][0] && dataStore.fitResults[keys[i]][0][1]){
                    mean[0] += dataStore.fitResults[keys[i]][0][1];
                    mean2[0] += Math.pow(dataStore.fitResults[keys[i]][0][1],2);
                    numFirst++;
                }
                if(dataStore.fitResults[keys[i]][1] && dataStore.fitResults[keys[i]][1][1]){
                    mean[1] += dataStore.fitResults[keys[i]][1][1];
                    mean2[1] += Math.pow(dataStore.fitResults[keys[i]][1][1],2);
                    numSecond++
                }
            }

            mean[0] /= numFirst;
            mean[1] /= numSecond;
            mean2[0] /= numFirst;
            mean2[1] /= numSecond;

            sd = [ Math.sqrt(mean2[0] - Math.pow(mean[0],2)), Math.sqrt(mean2[1] - Math.pow(mean[1],2))]

            dataStore.meanPeaks = mean;
            dataStore.sdPeaks = sd;

        },

        highlightOutliers: function(){
            //step through the fit results, and highlight table rows corresponding to wacky channels
            //this: x-gain-match-report object

            var i;
            var keys = Object.keys(dataStore.fitResults);

            for(i=0; i<keys.length; i++){
                if( dataStore.fitResults[keys[i]][0] && dataStore.fitResults[keys[i]][1] && (
                        dataStore.fitResults[keys[i]][0][1] > dataStore.meanPeaks[0] + dataStore.sdPeaks[0]*2
                        || dataStore.fitResults[keys[i]][0][1] < dataStore.meanPeaks[0] - dataStore.sdPeaks[0]*2
                        || isNaN(dataStore.fitResults[keys[i]][0][1])
                        || dataStore.fitResults[keys[i]][1][1] > dataStore.meanPeaks[1] + dataStore.sdPeaks[1]*2
                        || dataStore.fitResults[keys[i]][1][1] < dataStore.meanPeaks[1] - dataStore.sdPeaks[1]*2
                        || isNaN(dataStore.fitResults[keys[i]][1][1])
                    )
                ){
                    document.getElementById(this.id + keys[i].slice(0,10) + 'row').style = 'background-color: #FF0000;'
                } else{
                    document.getElementById(this.id + keys[i].slice(0,10) + 'row').style = ''
                }
            }
        },

        reconstructResolutionData: function(){
            //arrange the latest resolution info for representation in the dygraph.

            var i, evt, detectorIndex = [],
            flags = [];
            flags.fill(0,64)

            for(i=0; i<dataStore.GRIFFINdetectors.length; i++){
                detectorIndex[i] = i;
            }

            dataStore.resolutionData = arrangePoints(detectorIndex, [dataStore.lowPeakResolution, dataStore.highPeakResolution], flags );

            dispatcher({ 'data': dataStore.resolutionData }, dataStore.dygraphUpdateListeners, 'updateDyData');
        },

        updateEnergies: function(){
            //callback for the calibration source dropdown; updates energy input boxes with standard values
            //this: x-gain-match-report object

            var calibtationSource = getSelected(this.id + 'calibrationSource');
            var lowEnergy = document.getElementById(this.id + 'peak1');
            var highEnergy = document.getElementById(this.id + 'peak2');

            if(calibtationSource == 'Co-60'){
                lowEnergy.value = 1163
                highEnergy.value = 1332
            } else if(calibtationSource == 'Eu-152'){
                lowEnergy.value = 121
                highEnergy.value = 1408
            }
        },

        customEnergy: function(){
            //callback for changing the calibration energies to custom values
            //this: x-gain-match-report object

            var i, keys = Object.keys(dataStore.fitResults)
            var defaultSources = document.getElementById(this.id + 'calibrationSource')

            defaultSources.value = 'custom'
        },

        toggleFitMode: function(){
            //gain matcher needs special fit controls for convenience
            //this: fit mode engage button element

            var viewerName = dataStore.plots[0];

            if(parseInt(this.getAttribute('engaged'),10) == 0){
                dataStore.viewers[viewerName].setupFitMode();
                this.setAttribute('engaged', 1);
                if(this.id == 'fitLow')
                    document.getElementById('refitLoBadge').classList.add('redText')
                if(this.id == 'fitHigh')
                    document.getElementById('refitHiBadge').classList.add('redText')
            }
            else{
                dataStore.viewers[viewerName].leaveFitMode();
                this.setAttribute('engaged', 0);
                if(this.id == 'fitLow')
                    document.getElementById('refitLoBadge').classList.remove('redText')
                if(this.id == 'fitHigh')
                    document.getElementById('refitHiBadge').classList.remove('redText')
            }

            if(this.id == 'fitLow')
                dataStore.currentPeak = 0
            else
                dataStore.currentPeak = 1

        }
    }

});