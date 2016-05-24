function setupDataStore(){
    //declare top level groups
    var topGroups = [
        {
            "name": "Demo",
            "id": "demo",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Example",
                    "id": "example",
                    "items": [
                       'plot_example'
                   ]
                }
            ]
        }
    ]

    dataStore = {
        "topGroups": topGroups,                                     //groups in top nav row
        "plotNameListeners": ['plotControl'],                       //array of ids of elements listneing for requestPlot events
        "cutVertices": [],                                          //[x,y] vertices of cut region polygon
        "ODBhost": 'http://grsmid00.triumf.ca:8081',                //host:port of ODB to write cut region vertices to
        "raw": [0]
    }
}
setupDataStore();

function plotControl(wrapperID){
    // object to manage data requests and manipulate the plot

    this.wrapID = wrapperID;
    this.wrap = document.getElementById(wrapperID);

    this.setup = function(){
        //listen for plot requests
        this.wrap.addEventListener('requestPlot', this.routeNewPlot.bind(this), false);

        //which spectrum are we polling?
        this.activeSpectra = [null];

        // plot updates
        //update interval select
        document.getElementById('upOptions').onchange = this.startRefreshLoop.bind(document.getElementById('upOptions'), this);
        //update now button
        document.getElementById('upNow').onclick = this.refreshData.bind(this);
        //set the refresh loop going
        this.startRefreshLoop.bind(document.getElementById('upOptions'), this)();
    }

    this.startRefreshLoop = function(controlElement){
        //sets the refresh loop as a callback to changing the selector menu.
        //<controlElement>: plotControl element
        //this: select element (or anything with a .value of time in ms)

        var period = parseInt(this.value,10); //in miliseconds

        clearInterval(dataStore.dataRefreshLoop);
        if(period != -1)
            dataStore.dataRefreshLoop = setInterval(controlElement.refreshData.bind(controlElement), period );

    }

    /////////////////////
    // data routing
    /////////////////////

    this.routeNewPlot = function(event){
        //catch a requestPlot event, do appropriate things with it.
        //<event>: event; requestPlot custom event
        //this: plotControl object
        var i, evt;

        //what spectra has our attention?
        dataStore.activeSpectra = event.detail.plotName;
        this.activeSpectra = [event.detail.plotName];

        //demand refresh
        this.refreshData()
    }

    this.refreshData = function(){
        //refresh the current histogram data, then call fetchCallback()
        //this: plotControl object

        // fakey fake for development
        if(dataStore.activeSpectra){
            var  i;
            dataStore.raw = [4]
            for(i=0; i<16; i++){
                dataStore.raw.push(Math.random())
            }
            fetchCallback();
        }

        // var queries = constructQueries(this.activeSpectra);

        // Promise.all(queries.map(promiseJSONURL)
        //     ).then(
        //         function(spectra){
        //             var i, j, key, viewerKey;
        //             dataStore.rawData = {};

        //             for(i=0; i<spectra.length; i++){
        //                 for(key in spectra[i]){
        //                     //keep the raw results around
        //                     dataStore.rawData[key] = JSON.parse(JSON.stringify(spectra[i][key]));
        //                     //repopulate all spectra that use this spectrum
        //                     for(viewerKey in dataStore.viewers){
        //                         if(dataStore.viewers[viewerKey].plotBuffer[key]){
        //                             dataStore.viewers[viewerKey].addData(key, spectra[i][key]);
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     ).then(
        //         dataStore.ODBrequests.map(promiseScript)
        //     ).then(
        //         function(){
        //             if(typeof fetchCallback === "function"){
        //                 fetchCallback();
        //             }
        //     })
    }
}

function plotlyClick(data){
    // do something when the plot is clicked

    var li = document.createElement('li');

    // expand UI
    li.innerHTML = Mustache.to_html(
        dataStore.templates.cutVertex, 
        {
            'initialX': data.points[0].x,
            'initialY': data.points[0].y
        }
    );
    // point the delete vertex button at the right place
    li.getElementsByClassName('delete-vertex')[0].onclick = removeCutVertex;

    document.getElementById('cutPolyVertices').appendChild(li);

    //update dataStore
    extractCutVertices();

    //update plot (as if the data has been refreshed)
    fetchCallback()
}

function extractCutVertices(){
    // read the cut vertices from the UI and pack them in dataStore.cutVertices as [[x0,y0], [x1,y1],...]

    var xVertices = document.getElementsByClassName('vertex-x'),
        yVertices = document.getElementsByClassName('vertex-y'),
        i;

    dataStore.cutVertices = [];
    for(i=0; i<xVertices.length; i++){
        dataStore.cutVertices.push([xVertices[i].value, yVertices[i].value])
    }
}

function fetchCallback(){
    //runs after every time the histogram is updated

    // make the plot
    generatePlot();

    // plug in the onclicks
    document.getElementById('plotlyTarget').on('plotly_click', plotlyClick);
}

function generatePlot(){
    // take the plot data sitting on datastore.raw, and render it.
    var binning = generateBins(dataStore.raw.length-1, dataStore.raw[0]),
        data = [
            {
                x: binning.x,
                y: binning.y,
                z: dataStore.raw.slice(1),
                type: 'contour',
                name: 'Plot Name', 
                hoverinfo:"x+y+z",
                colorscale: 'Viridis',
                zaxis: {
                    autorange: true
                }
            }
        ],
        dim = Math.min(document.getElementById('plotlyTarget').offsetWidth, window.innerHeight),
        layout = {
            title: dataStore.activeSpectra,
            xaxis:{
                title: 'x axis'
            },
            yaxis:{
                title: 'y axis'
            },
            autosize: false,
            width: dim,
            height: dim,
        }

        if(dataStore.cutVertices.length > 0){
            layout.shapes = [
                {
                    type: 'path',
                    path: generatePlotlyPath(),
                    fillcolor: 'rgba(0,0,0,0)',
                    line: {
                        color: 'rgb(255, 0, 0)'
                    }
                }
            ]
        }

    Plotly.newPlot('plotlyTarget', data, layout);
}

function generateBins(total, rowlength){
    // z-data arrives in a linear array, x0,y0, x1,y0, ..., xmax,y0, x0,y1, x1,y1, ...
    // plotly needs arrays of x and y bin coords in order.
    // generate these for max xmax = xrowlength, and total number of bins.

    var x = [],
        y = [],
        nRows = total / rowlength,
        i,j;

    for(i=0; i<nRows; i++){
        for(j=0; j<rowlength; j++){
            x.push(j);
            y.push(i);
        }
    }

    return {'x':x, 'y':y}
}

function generatePlotlyPath(){
    // plotly draws shapes from a string encoding:
    // 'M x0 y0 L x1 y1 L x2 y2 .... Z'
    // generate this from dataStore.cutVertices

    var i, encoding = 'M ';

    for(i=0; i<dataStore.cutVertices.length; i++){
        if(i!==0)
            encoding += 'L '

        encoding += dataStore.cutVertices[i][0] + ' ';
        encoding += dataStore.cutVertices[i][1] + ' ';
    }

    return encoding+'Z'
}

function removeCutVertex(){
    // onclick callback for removing a cut vertex
    // this == delete button

    var parent = this.parentElement,
        grandparent = parent.parentElement;

        grandparent.removeChild(parent);

    extractCutVertices();
    fetchCallback();
}

function moveCutVertex(){
    // onchange callbakc for changing the coordinates of a cut vertex
    // this == input:number element

    extractCutVertices();
    fetchCallback();  
}

function saveCutToODB(){
    // take the current cut vertices and save them to the ODB

    var writeX = dataStore.ODBhost + '?cmd=jset&odb=/demo/x[*]&value=',
        writeY = dataStore.ODBhost + '?cmd=jset&odb=/demo/y[*]&value=', 
        i;

    for(i=0; i<dataStore.cutVertices.length; i++){
        writeX += dataStore.cutVertices[i][0] + ',';
        writeY += dataStore.cutVertices[i][1] + ',';
    }

    writeX = writeX.slice(0,-1);
    writeY = writeY.slice(0,-1);

    XHR(writeX);
    XHR(writeY);

    //someday, in the distant future, when MIDAS uses the right cors headers, we'll be able to check the jset response and respond appropriately...
    //XHR(writeX, null, flashElement.bind(null, 'x-success', 5), flashElement.bind(null, 'x-fail', 5));
    //XHR(writeY, null, flashElement.bind(null, 'y-success', 5), flashElement.bind(null, 'y-fail', 5));
}

function flashElement(id, n){
    // remove an element's hidden class, then add it back n seconds later

    document.getElementById(id).classList.remove('hidden');
    window.setTimeout(function(id){
        document.getElementById(id).classList.add('hidden');  
    }.bind(null, id), n*1000)
}