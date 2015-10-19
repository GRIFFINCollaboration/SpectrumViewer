function dataSetup(data){
    //define data for templates

    return dataStore.defaults

}

function fetchSpectrum(id){
    //refreshes the data for spectrum id.

    if(id==dataStore.targetSpectrum)
        dataStore.viewer.addData(id, dataStore.testData);
    else
        dataStore.viewer.addData(id, [Math.random()*100]);
}

function fetchCallback(){
    var sumOld, sumNew;

    //runs as callback after all data has been refreshed.
    //keep track of this histogram and the last one for calculating rates:
    if(dataStore.currentSpectrum){
        sumOld = dataStore.oldSpectrum.integrate(0,100);
        dataStore.oldSpectrum = JSON.parse(JSON.stringify(dataStore.currentSpectrum));
    }
    dataStore.currentSpectrum = JSON.parse(JSON.stringify(dataStore.viewer.plotBuffer[dataStore.targetSpectrum]));
    sumNew = dataStore.currentSpectrum.integrate(0,100);

    //note that at run start, the oldSpectrum will still have the stale state of the spectrum in it from last run,
    //since the analyzer keeps broadcasting it; need to detect when the spectrum has been zeroed and also skip here.
    if(sumNew < sumOld)
        dataStore.oldSpectrum = [];

    dataStore.oldTime = dataStore.currentTime;
    dataStore.currentTime = Date.now()/1000;

    //update the rate monitor and backgrounds fits
    appendNewPoint();
    //redraw spectrum, fit results included
    dataStore.viewer.plotData();
}

function appendNewPoint(){
    //integrate gamma windows and append result as new point on rate monitor.
    var i, j, id, min, max, gates = [], levels = [], bkgTechnique, bkgSample, bkgPattern, bkg, y0, y1, bkgColor;

    dataStore.viewer.binHighlights = [];
    //subtract backgrounds from gates in new histogram if asked.
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        id = dataStore.defaults.gammas[i].index;
        min = dataStore.viewer.verticals['min' + id].bin
        max = dataStore.viewer.verticals['max' + id].bin

        //attempt to fit & subtract background
        bkgTechnique = document.querySelector('input[name="bkg'+id+'"]:checked').value;
        dataStore.viewer.removeLine('bkg'+id);
        if(min!=max && bkgTechnique != 'off'){
            bkgPattern = dataStore.manualBKG['bins'+id];
            bkgSample = [[],[]];
            if(bkgTechnique=='auto'){
                bkgSample = constructAutoBackgroundRange(min, max);
            } else if(bkgTechnique=='manual' && bkgPattern ){ //ie only even try to do this if a valid bkgPattern has made it into the dataStore.
                bkgSample = constructManualBackgroundRange(bkgPattern, dataStore.viewer.plotBuffer[dataStore.currentSpectrum]);
            }

            //highlight selected background bins
            bkgColor = fadeHexColor(dataStore.colors[i], 0.2);
            for(j=0; j<bkgSample[0].length; j++){
                dataStore.viewer.binHighlights[bkgSample[0][j]] = {
                    'color': bkgColor,
                    'height': bkgSample[1][j]
                }
            }

            //fit background
            bkg = dataStore.viewer.linearBKG.apply(null, bkgSample);

            //update annotation with fit line
            y0 = bkg[0] + (min-1)*bkg[1];
            y1 = bkg[0] + max*bkg[1];
            dataStore.viewer.addLine('bkg'+id, min-1, y0, max, y1, dataStore.colors[i]);

            //subtract the fit background
            if(!isNaN(bkg[0]) && !isNaN(bkg[1]) ){
                for(j=min; j<max; j++){
                    this.dataStore.currentSpectrum[j] -= bkg[0] + j*bkg[1];
                }
            }
        }
    }

    //can't continue until two histograms have been collected;
    if(dataStore.oldSpectrum.length == 0)
        return;

    //calculate change from last collection to this one
    dataStore.histoDiff = subtractHistograms(dataStore.oldSpectrum, dataStore.currentSpectrum);

    //integrate gamma window on difference histogram
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        id = dataStore.defaults.gammas[i].index;
        min = dataStore.viewer.verticals['min' + id].bin
        max = dataStore.viewer.verticals['max' + id].bin

        gates[i] = 0;
        for(j=min; j<max; j++){
            gates[i] += dataStore.histoDiff[j];
        }
        gates[i] /= (dataStore.currentTime - dataStore.oldTime);        
    }
    
    //add on levels data
    for(i=0; i<dataStore.defaults.levels.length; i++){
        levels.push(dataStore.viewer.plotBuffer[dataStore.defaults.levels[i].id][0])
    }

    //update data history
    dataStore.rateData.push( [new Date()].concat(gates).concat(levels) );

    //update plot
    updateDygraph();

}

function constructAutoBackgroundRange(min, max){
    //returns [[bin numbers], [corresponding bin values]] based on the gate described by min, max,
    //for use as a background sample to fit to.

    var halfwidth, lowerBKG, upperBKG, bkg, bins, i;

    halfwidth = 3*(max-min);
    lowerBKG = dataStore.viewer.plotBuffer[dataStore.targetSpectrum].slice(min - halfwidth, min);
    upperBKG = dataStore.viewer.plotBuffer[dataStore.targetSpectrum].slice(max, max + halfwidth );
    bkg = lowerBKG.concat(upperBKG);
    bins = []
    for(i=0; i<halfwidth; i++){
        bins[i] = i + min - halfwidth;
        bins[i+halfwidth] = i + max;
    }
    return dataStore.viewer.scrubPeaks(bins, bkg);

}

function constructManualBackgroundRange(encoding, spectrum){
    //given an encoded string of bins, parse and return an array consising of an array of those bin numbers, and
    //another array of the corresponding bin heights.
    //encoding is as 20-25;27;32-50 etc.
    var rangeStrings = encoding.split(';'),
        i, j, ranges = [],
        x = [], y = [];

    if(encoding == "")
        return [x, y]

    for(i=0; i<rangeStrings.length; i++){
        ranges.push( rangeStrings[i].split('-').map(function(val){return parseInt(val, 10)}) );
    }

    for(i=0; i<ranges.length; i++){
        if(ranges[i].length == 1){
            x.push(ranges[i][0]);
            y.push(spectrum[ranges[i][0]]);
        } else{
            for(j=ranges[i][0]; j<=ranges[i][1]; j++){
                x.push(j);
                y.push(spectrum[j]);
            }
        }
    }

    return [x,y]
}

function updateManualFitRange(){
    //callback to register a manual fit range
    var index = parseInt(this.id.slice(4),10);
    var bkgTechnique = document.querySelector('input[name="bkg'+index+'"]:checked').value;

    if(this.checkValidity()){
        dataStore.manualBKG[this.id] = this.value
        if(bkgTechnique == 'manual')
            queueAnnotation(dataStore.defaults.gammas[index].title, 'Manual BKG bins updated to ' + this.value)
    }
}

function changeFitMethod(){
    //callback after changing the fit method radio
    var index = parseInt(this.name.slice(3),10);
    queueAnnotation(dataStore.defaults.gammas[index].title, 'BKG Method Changed to ' + this.value)
    fetchCallback()
}

function windowSliderCallback(){
    //oninput behavior of the window width slider

    var hours = Math.floor(parseInt(this.value, 10) / 60);
    var minutes = parseInt(this.value, 10) % 60;

    document.getElementById(this.id+'Value').innerHTML = hours + 'h:' + minutes +'m'
}

function leadingEdgeSliderCallback(){
    //oninput behavior of the window leading edge slider

    var seconds = windowLeadingEdgeTime();
    var hours = Math.floor(seconds / (3600));
    var minutes = Math.floor((seconds % 3600) / 60);

    document.getElementById(this.id+'Value').innerHTML = hours + 'h:' + minutes +'m ago'
    if(this.value == 0)
        document.getElementById(this.id+'Value').innerHTML = 'now'
}

function windowLeadingEdgeTime(){
    //returns number of seconds in the past the currently requested window leading edge is

    var leadingEdgeSlider = document.getElementById('leadingEdgeSlider');
    var first = dataStore.rateData[0][0];
    var last = dataStore.rateData[dataStore.rateData.length - 1][0];
    var history = -1 * parseInt(leadingEdgeSlider.value,10) / ( parseInt(leadingEdgeSlider.max,10) - parseInt(leadingEdgeSlider.min,10) );

    return Math.floor((last-first)*history / 1000);
}

function updateDygraph(){
    //decide how many points to keep from the history, and plot.
    var i, period, leadingEdge, data, annotations, keys

    //extract the appropriate tail of the data history
    leadingEdge = windowLeadingEdgeTime() / 3;
    period = parseInt(document.getElementById('windowSlider').value,10) * 60 // in seconds
    period = Math.ceil(period/3); //this many points to keep at the end, 3 seconds per point
    data = dataStore.rateData.slice(Math.max(0,dataStore.rateData.length - period - leadingEdge), Math.max(0,dataStore.rateData.length - leadingEdge));

    //update the dygraph
    dataStore.dygraph.updateOptions( { 'file': data } );

    //update annotations
    keys = Object.keys(dataStore.annotations)
    if(keys.length > 0 ){
        annotations = dataStore.dygraph.annotations()
        for(i=0; i<keys.length; i++){
            dataStore.annotations[keys[i]].x = data[data.length-1][0].getTime();
            annotations.push(dataStore.annotations[keys[i]]);
        }
        dataStore.dygraph.setAnnotations(annotations)
        dataStore.annotations = {};
    }
}

function pageLoad(){
    //runs after ultralight is finished setting up the page.
    var i, node, gammaWindowToggles, gammaWindowEdges, snapGammaButtons, levelToggles;

    //set up gamma spectrum
    createFigure();
    //plug in plot control callbacks:
    setupFigureControl();

    //prepare initial gamma windows
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        drawWindow(i, dataStore.defaults.gammas[i].min, dataStore.defaults.gammas[i].max);
    }

    //plot the spectrum of interest
    dataStore.viewer.addData(dataStore.targetSpectrum, []);
    //add levels items as hidden plots so they get scooped up in the refresh cycle:
    for(i=0; i<dataStore.defaults.levels.length; i++){
        dataStore.viewer.addData(dataStore.defaults.levels[i].id, [])
        dataStore.viewer.hideSpectrum[dataStore.defaults.levels[i].id] = true;
    }
    refreshPlots();

    //set up Dygraph
    createRateMonitor();

    //UI bindings
    gammaWindowToggles = document.getElementsByClassName('gammaToggle')
    for(i=0; i<gammaWindowToggles.length; i++){
        gammaWindowToggles[i].onclick = toggleGammaWindow.bind(null, i);
    }
    gammaWindowEdges = document.getElementsByClassName('gammaEdge')
    for(i=0; i<gammaWindowEdges.length; i++){
        gammaWindowEdges[i].onchange = moveGammaWindow;
    }
    snapGammaButtons = document.getElementsByClassName('snapGateToWindow')
    for(i=0; i<snapGammaButtons.length; i++){
        snapGammaButtons[i].onclick = snapGateToWindow;
    }
    levelToggles = document.getElementsByClassName('levelToggles')
    for(i=0; i<levelToggles.length; i++){
        levelToggles[i].onchange = toggleDygraph.bind(levelToggles[i], i + dataStore.defaults.gammas.length);
    }
    fitOptions = document.getElementsByClassName('fitOptions')
    for(i=0; i<fitOptions.length; i++){
        fitOptions[i].onchange = changeFitMethod;
    }
    fitRanges = document.getElementsByClassName('manualBKG')
    for(i=0; i<fitRanges.length; i++){
        fitRanges[i].onchange = updateManualFitRange;
    }
    document.getElementById('windowSlider').onchange = updateDygraph;
    document.getElementById('windowSlider').oninput = windowSliderCallback;
    document.getElementById('leadingEdgeSlider').oninput = leadingEdgeSliderCallback;

    //manage which gamma window are on by defualt
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        if(!dataStore.defaults.gammas[i].onByDefault)
            document.getElementById('display' + dataStore.defaults.gammas[i].index).click()
    }

    //start periodic refresh
    document.getElementById('upOptions').value = 3000;
    document.getElementById('upOptions').onchange();
    //don't allow refresh period to change
    node = document.getElementById("updateWrap");
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }

}

////////////////////////////////////////
// handle gamma windows
////////////////////////////////////////

function toggleGammaWindow(index){
    //toggle the indexed gamma window on or off in the spectrum

    //present, remove
    if(dataStore.viewer.verticals['min'+index] && dataStore.viewer.suppressedAnnotations.indexOf('min'+index) == -1  ){
        dataStore.viewer.suppressAnnotation('min'+index);
        dataStore.viewer.suppressAnnotation('max'+index);

        dataStore.dygraph.setVisibility(index, false);
    //not present, add
    } else{
        drawWindow(index, document.getElementById('min'+index).value, document.getElementById('max'+index).value );
        dataStore.dygraph.setVisibility(index, true);
    }

    this.dataStore.viewer.plotData();
}

function moveGammaWindow(){
    //callback for chaging gamma window edges

    var color = dataStore.viewer.verticals[this.id].color
    dataStore.viewer.removeVertical(this.id)
    dataStore.viewer.addVertical(this.id, parseInt(this.value, 10), color)
    queueAnnotation(dataStore.defaults.gammas[parseInt(this.id.slice(3),10)].title, 'Gate ' + this.id.substring(0,3) + ' updated to ' + this.value)

    dataStore.viewer.plotData();
}

function drawWindow(index, min, max){
    //draw the appropriate window on the plot; index corresponds to dataStore.defaults.gammas[index]

    //delete the old lines
    dataStore.viewer.removeVertical('min' + index);
    dataStore.viewer.removeVertical('max' + index);
    //make new lines
    dataStore.viewer.addVertical('min' + index, min, dataStore.defaults.gammas[index].color)
    dataStore.viewer.addVertical('max' + index, max, dataStore.defaults.gammas[index].color)
    //make sure these lines aren't getting suppressed
    dataStore.viewer.unsuppressAnnotation('min' + index);
    dataStore.viewer.unsuppressAnnotation('max' + index);
}

function snapGateToWindow(){
    //callback for button to snap corresponding gamma gate to present window
    var index = this.id.slice(4)

    document.getElementById('min'+index).value = dataStore.viewer.XaxisLimitMin;
    document.getElementById('max'+index).value = dataStore.viewer.XaxisLimitMax;

    document.getElementById('min'+index).onchange()
    document.getElementById('max'+index).onchange()
}

///////////////////////////////
// annotation wrangling
///////////////////////////////

function queueAnnotation(series, flag){
    //sets up the <flag> text to appear in the annotation for the next point on <series>

    if(dataStore.annotations[series] && dataStore.annotations[series].text.indexOf(flag) == -1){
        dataStore.annotations[series].text += '\n' + flag;
    } else{
        dataStore.annotations[series] = {
            'series': series,
            'shortText': '?',
            'text': flag,
            'cssClass': 'annotation'
        }
    }
}


///////////////////////////////
// dygraph wrangling
///////////////////////////////

function createRateMonitor(){
    //plot intensity versus AQ in a div#divID, and show magnet transmission region

    var i, labels = ['time']

    //construct plot labels
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        labels.push(dataStore.defaults.gammas[i].title);
    }
    for(i=0; i<dataStore.defaults.levels.length; i++){
        labels.push(dataStore.defaults.levels[i].title)
    }


    dataStore.dygraph = new Dygraph(
        // containing div
        document.getElementById('dygraph'),

        // data
        dataStore.rateData,

        //style
        {   
            labels: labels,
            title: 'Gate Integrals for ' + dataStore.targetSpectrum,
            height: document.getElementById('plotID').offsetHeight - dataStore.viewer.bottomMargin + 20,
            width: document.getElementById('plotID').offsetWidth,
            colors: dataStore.colors,
            axisLabelColor: '#FFFFFF',
            axes: {
                x: {
                    axisLabelFormatter: function(Date, granularity, opts, dygraph){
                        return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                    }
                }
            },
            labelsDiv: 'rateLegend',
            legend: 'always'
        }
    );
}

function toggleDygraph(index){
    //set the dygraph series at index to the state of a checkbox, used as onchange callback
    dataStore.dygraph.setVisibility(index, this.checked);
}




dataStore = {};
dataStore.manualBKG = {};
dataStore.rateData = [[new Date(),0,0,0,0,0]];
dataStore.annotations = {};
dataStore.targetSpectrum = 'SUM_Singles_Energy';
dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';
dataStore.ODBrequests = ['http://grsmid00.triumf.ca:8081/?cmd=jcopy&odb0=/Equipment/Epics/Variables/MSRD&encoding=json'];
dataStore.currentSpectrum = [];
dataStore.oldSpectrum = [];
dataStore.currentTime = null;
dataStore.oldTime = null;
dataStore.colors = [
    "#AAE66A",
    "#EFB2F0",
    "#40DDF1",
    "#F1CB3C",
    "#FFFFFF",
    "#F22613",
    "#786FBC",
    "#619D48",
    "#AA5FC7",
    "#D35400"
]
dataStore.defaults = {
        'gammas':[
            {
                'title': 'Gate 1',
                'index': 0,
                'min': 497,
                'max': 504,
                'color': "#AAE66A",
                'onByDefault': true
            },
            {
                'title': 'Gate 2',
                'index': 1,
                'min': 197,
                'max': 204,
                'color': "#EFB2F0",
                'onByDefault': true
            },
            {
                'title': 'Gate 3',
                'index': 2,
                'min': 0,
                'max': 0,
                'color': "#40DDF1",
                'onByDefault': false
            },
            {
                'title': 'Gate 4',
                'index': 3,
                'min': 0,
                'max': 0,
                'color': "#F1CB3C",
                'onByDefault': false
            },
            {
                'title': 'Gate 5',
                'index': 4,
                'min': 0,
                'max': 0,
                'color': "#FFFFFF",
                'onByDefault': false
            }  
        ],

        'levels':[
            // {
            //     'title': 'Proton Current',  //label
            //     'id': 'PC'                  //target plot identifier
            // },
            // {
            //     'title': 'Laser Freq. 1',
            //     'id': 'LF1'
            // },
            // {
            //     'title': 'Laser Freq. 2',
            //     'id': 'LF2'
            // }
        ]
    }
dataStore.testData = [998, 994, 996, 1000, 992, 993, 995, 990, 989, 995, 989, 986, 992, 987, 990, 983, 987, 978, 977, 980, 980, 978, 981, 979, 977, 971, 969, 968, 970, 966, 966, 973, 972, 968, 967, 966, 968, 960, 963, 964, 958, 957, 960, 952, 960, 958, 950, 955, 952, 950, 952, 944, 947, 951, 948, 940, 946, 942, 943, 936, 938, 942, 937, 941, 931, 937, 932, 933, 934, 927, 925, 928, 926, 929, 922, 922, 926, 919, 919, 917, 924, 918, 915, 921, 919, 917, 910, 909, 909, 915, 905, 912, 905, 906, 909, 906, 900, 901, 899, 904, 903, 897, 898, 899, 898, 893, 896, 897, 892, 889, 887, 893, 888, 890, 884, 887, 883, 885, 884, 882, 884, 875, 878, 876, 872, 877, 873, 872, 874, 873, 869, 872, 868, 865, 863, 862, 866, 859, 862, 857, 862, 859, 862, 856, 860, 858, 849, 857, 850, 847, 849, 849, 850, 849, 842, 849, 842, 845, 845, 839, 844, 843, 835, 832, 837, 833, 833, 833, 830, 828, 826, 828, 827, 830, 823, 820, 826, 822, 818, 821, 824, 817, 821, 818, 820, 812, 809, 814, 815, 814, 808, 808, 811, 802, 809, 804, 804, 807, 801, 1067, 2797, 1070, 800, 795, 791, 793, 794, 793, 790, 795, 792, 792, 783, 791, 790, 780, 780, 785, 779, 780, 778, 782, 776, 780, 779, 778, 770, 773, 767, 771, 774, 764, 763, 764, 764, 769, 762, 764, 765, 756, 760, 757, 757, 758, 755, 755, 755, 753, 754, 746, 746, 748, 748, 748, 746, 746, 748, 744, 744, 737, 742, 735, 742, 740, 732, 732, 736, 733, 727, 732, 734, 726, 727, 724, 728, 724, 721, 718, 723, 720, 717, 721, 716, 721, 715, 710, 717, 714, 711, 713, 711, 711, 712, 704, 704, 708, 708, 704, 699, 700, 695, 702, 701, 699, 700, 699, 698, 692, 692, 692, 687, 684, 685, 691, 689, 684, 686, 680, 677, 685, 679, 674, 674, 680, 673, 671, 673, 671, 673, 669, 668, 671, 664, 666, 664, 665, 665, 663, 660, 657, 656, 658, 662, 660, 656, 659, 657, 649, 648, 652, 654, 644, 644, 643, 643, 648, 645, 646, 643, 645, 643, 636, 639, 638, 636, 634, 634, 630, 629, 633, 629, 625, 629, 630, 622, 622, 619, 627, 626, 621, 615, 619, 616, 612, 612, 615, 609, 610, 613, 613, 610, 609, 603, 609, 610, 604, 605, 604, 605, 600, 596, 601, 598, 592, 597, 598, 593, 595, 596, 591, 589, 587, 584, 583, 589, 587, 588, 584, 577, 580, 584, 578, 581, 573, 573, 576, 569, 573, 573, 569, 574, 566, 567, 564, 563, 567, 568, 563, 564, 557, 558, 559, 557, 556, 557, 554, 557, 553, 553, 551, 554, 550, 547, 546, 543, 546, 546, 547, 544, 536, 537, 542, 539, 537, 532, 537, 535, 529, 533, 526, 533, 528, 531, 523, 524, 521, 521, 519, 526, 520, 517, 516, 520, 520, 514, 513, 514, 513, 516, 508, 514, 510, 504, 511, 505, 503, 508, 502, 507, 1857, 10497, 1854, 500, 503, 1312, 6490, 1309, 495, 496, 490, 488, 489, 490, 490, 490, 488, 486, 485, 480, 480, 482, 477, 481, 478, 472, 475, 477, 477, 472, 471, 470, 464, 463, 465, 465, 467, 467, 463, 466, 457, 456, 463, 456, 453, 454, 453, 453, 450, 451, 452, 452, 451, 451, 447, 444, 443, 441, 445, 445, 442, 438, 438, 436, 437, 439, 437, 436, 433, 436, 435, 425, 427, 430, 423, 427, 424, 424, 418, 424, 419, 419, 423, 415, 415, 414, 418, 409, 409, 411, 407, 413, 413, 405, 403, 401, 408, 406, 403, 406, 402, 403, 403, 399, 396, 398, 399, 395, 388, 388, 389, 393, 393, 386, 382, 387, 386, 387, 382, 384, 382, 377, 380, 382, 378, 379, 377, 371, 376, 367, 366, 368, 370, 364, 369, 368, 363, 361, 360, 364, 357, 362, 358, 355, 352, 358, 356, 357, 348, 352, 352, 351, 349, 348, 348, 349, 344, 345, 342, 344, 340, 344, 334, 338, 333, 340, 338, 338, 335, 328, 332, 329, 325, 326, 325, 329, 321, 322, 318, 322, 322, 320, 314, 321, 316, 313, 313, 312, 310, 315, 310, 314, 308, 307, 306, 306, 308, 299, 299, 306, 297, 304, 297, 295, 299, 293, 294, 298, 288, 288, 292, 286, 286, 291, 288, 282, 288, 288, 283, 286, 285, 277, 282, 277, 272, 273, 279, 273, 274, 276, 267, 267, 273, 264, 264, 267, 266, 261, 260, 266, 263, 260, 255, 258, 255, 259, 258, 255, 255, 253, 255, 252, 245, 247, 249, 242, 240, 241, 239, 239, 241, 244, 242, 240, 241, 234, 230, 238, 236, 234, 227, 227, 226, 231, 223, 225, 222, 224, 220, 224, 223, 222, 217, 217, 215, 215, 217, 213, 217, 213, 210, 211, 208, 212, 211, 206, 202, 206, 205, 200, 197, 197, 201, 199, 194, 199, 190, 198, 189, 187, 186, 187, 187, 187, 184, 187, 181, 183, 183, 180, 180, 177, 177, 174, 179, 171, 177, 172, 172, 168, 167, 172, 168, 170, 165, 168, 160, 160, 165, 160, 162, 161, 158, 159, 154, 152, 150, 152, 154, 149, 155, 154, 152, 148, 142, 145, 142, 144, 146, 141, 141, 139, 137, 138, 136, 136, 138, 137, 133, 133, 132, 133, 126, 128, 124, 126, 127, 127, 126, 126, 120, 115, 117, 117, 119, 117, 118, 116, 115, 110, 114, 110, 113, 112, 110, 108, 105, 100, 103, 104, 100, 100, 96, 99, 101, 98, 90, 89, 97, 93, 88, 85, 85, 90, 89, 83, 83, 84, 79, 81, 84, 81, 75, 82, 81, 71, 78, 77, 72, 67, 67, 71, 69, 70, 69, 69, 67, 67, 59, 61, 64, 61, 56, 53, 58, 60, 59, 53, 51, 52, 54, 51, 44, 45, 51, 45, 42, 40, 46, 41, 44, 35, 38, 35, 33, 40, 35, 33, 37, 33, 32, 29, 27, 26, 27, 30, 21, 24, 19, 19, 19, 18, 14, 20, 19, 17, 13, 16, 17, 14, 7, 12, 12, 10, 8, 7, 5, 3, 7, 0, 0]
//dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];