function dataSetup(data){

    //decide which dataset(s) will be plotted, and put the data in the appropriate place.
    dataStore.activeSpectrum = fetchSpectrum(data.plotid)

    //generate list of all available plots and routes
    var plots = [
        {'url': '?plotid=0', 'title': 'plot number one'},
        {'url': '?plotid=1', 'title': 'plot number two'},
        {'url': '?plotid=2', 'title': 'plot number three'}
    ]

    var groups = [
        {'groupTitle': 'Group A', 'plots': plots},
        {'groupTitle': 'Group B', 'plots': plots},
        {'groupTitle': 'Group C', 'plots': plots}
    ]

    return {
        'groups': groups
    }

}

function pageLoad(){
    //runs after ultralight is finished setting up the page.

    createFigure();

    //jiggery-pokery to prevent page jump when clicking through spectra
    (function() {
        var sneaky = new ScrollSneak(location.hostname), tabs = document.getElementsByTagName('a'), i = 0, len = tabs.length;
        for (; i < len; i++) {
            tabs[i].onclick = sneaky.sneak;
        }
    })();
}

function createFigure(){

    var width = 0.9*document.getElementById('plotWrap').offsetWidth;
    var height = 32/48*width;
    var canvas = document.getElementById('plotID')
    var viewer

    canvas.width = width;
    canvas.height = height;
    viewer = new spectrumViewer('plotID');
    viewer.addData('testPlot', dataStore.activeSpectrum);
    viewer.plotData();
}

function fetchSpectrum(id){
    //return the y-values of the requested spectrum in an array.

    if(id=='0')
        return dataStore.testData;
    if(id=='1')
        return createBins(500);
    if(id=='2')
        return createBins(500, 10);
}



dataStore = {}
dataStore.testData = [200,48,42,48,58,57,59,72,85,68,61,60,72,147,263,367,512,499,431,314,147,78,35,22,13,9,16,7,10,13,5,5,3,1,2,4,0,1,1,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,200,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,80,120,70,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,300,650,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];