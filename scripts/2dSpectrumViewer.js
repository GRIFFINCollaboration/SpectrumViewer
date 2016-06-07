function setupDataStore(){
    //declare top level groups
    var topGroups = [
        {
            "name": "Annikal",
            "id": "annikal",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "energy",
                    "items": [
                       '2D_dE_vs_E'
                   ]
                }
            ]
        }
    ]

    dataStore = {
        "topGroups": topGroups,                                     //groups in top nav row
        "plotNameListeners": ['plotControl'],                       //array of ids of elements listneing for requestPlot events
        "cutVertices": [],                                          //[x,y] vertices of cut region polygon
        "ODBhost": 'http://annikal.triumf.ca:8081',                 //host:port of ODB to write cut region vertices to
        "spectrumServer": 'http://annikal.triumf.ca:9093',          //host:port to pull raw spectra from
        "raw": [0],
        "closeMenuOnclick": true                                    //don't keep the plot menu open onclick (can only plot one at a time anyway)
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
        dataStore.hm.plotTitle = event.detail.plotName;

        //don't need plot help anymore; swap in roi help
        document.getElementById('intro-plot-picker').classList.add('hidden');
        document.getElementById('intro-shift-click').classList.remove('hidden');

        //demand refresh
        this.refreshData()
    }

    this.refreshData = function(){
        //refresh the current histogram data, then call fetchCallback()
        //this: plotControl object

        // // fakey fake for development
        // if(dataStore.activeSpectra){
        //     var  i;
        //     dataStore.raw = [512]
        //     for(i=0; i<512*512; i++){
        //         dataStore.raw.push(Math.random())
        //     }
        //     fetchCallback();
        // }

        var queries = constructQueries(this.activeSpectra);

        if(dataStore.activeSpectra){
            Promise.all(queries.map(promiseJSONURL)
                ).then(
                    function(spectra){
                        dataStore.raw = spectra[0][dataStore.activeSpectra];
                        fetchCallback(); 
                    }
                )
        }
    }
}

function heatmapClick(evt){
    // do something when the plot is clicked

    var data = evt.detail,
        li = document.createElement('li'),
        i;

    // abort if this point already added to list
    // mitigates funky multiple-fires of heatmap_click when updating
    for(i=0; i<dataStore.cutVertices.length; i++){
        if(dataStore.cutVertices[i][0] == data.cell.x && dataStore.cutVertices[i][1] == data.cell.y)
            return 0;
    }

    // don't need plot click help anymore
    document.getElementById('intro-shift-click').classList.add('hidden');

    // expand UI
    li.innerHTML = Mustache.to_html(
        dataStore.templates.cutVertex, 
        {
            'initialX': data.cell.x,
            'initialY': data.cell.y
        }
    );
    // point the delete vertex button at the right place
    li.getElementsByClassName('delete-vertex')[0].onclick = removeCutVertex;
    // point the move vertex buttons at the right place
    li.getElementsByClassName('move-vertex-up')[0].onclick = moveVertex.bind(li, 'up');
    li.getElementsByClassName('move-vertex-down')[0].onclick = moveVertex.bind(li, 'down');

    document.getElementById('cutPolyVertices').appendChild(li);

    //update dataStore
    extractCutVertices();

    //update plot overlay
    dataStore.hm.render();
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
    dataStore.hm.raw = packZ(dataStore.raw);
    dataStore.hm.drawData();
    dataStore.hm.render();

    // plug in the onclicks
    dataStore.hm.canvas.addEventListener('heatmap_shiftclick', heatmapClick, false);
}

function generateOverlay(){
    // generate the gate polygon overlay

    var i, coords, update = {};

    dataStore.hm.ctx[1].clearRect(0,0,dataStore.hm.width, dataStore.hm.height);
    if(dataStore.cutVertices.length > 1){
        // line style
        dataStore.hm.ctx[1].strokeStyle = '#FFFFFF';
        dataStore.hm.ctx[1].lineWidth = 2;
        // don't draw outside of data area
        dataStore.hm.ctx[1].clip(dataStore.hm.dataArea);

        coords = dataStore.hm.cell2coords(dataStore.cutVertices[0][0], dataStore.cutVertices[0][1]);
        dataStore.hm.ctx[1].beginPath();
        dataStore.hm.ctx[1].moveTo(coords.x, coords.y);
        for(i=1;i<dataStore.cutVertices.length; i++){
            coords = dataStore.hm.cell2coords(dataStore.cutVertices[i][0], dataStore.cutVertices[i][1]);
            dataStore.hm.ctx[1].lineTo(coords.x, coords.y);
        }
        dataStore.hm.ctx[1].closePath();
        dataStore.hm.ctx[1].stroke();
        dataStore.hm.ctx[1].restore();
    }
}

function packZ(raw){
    // histo z values arrive as [row length, x0y0, x1y0, ..., x0y1, x1y1, ..., xmaxymax]
    // heatmap wants it as [[x0y0, x1y0, ..., xmaxy0], [x0y1, x1y1, ..., xmaxy1], ...]

    var repack = [],
        nRows = (raw.length-1)/raw[0],
        i;

    for(i=0; i<nRows; i++){
        repack.push(raw.slice(1+raw[0]*i, 1+raw[0]*(i+1)));
    }

    return repack;
}

function removeCutVertex(){
    // onclick callback for removing a cut vertex
    // this == delete button

    var parent = this.parentElement,
        grandparent = parent.parentElement;

        grandparent.removeChild(parent);

    extractCutVertices();
    dataStore.hm.render();
}

function moveCutVertex(){
    // onchange callbakc for changing the coordinates of a cut vertex
    // this == input:number element

    extractCutVertices();
    dataStore.hm.render();
}

function saveCutToODB(){
    // take the current cut vertices and save them to the ODB
    var xVals=[], yVals=[],
        i;

    for(i=0; i<dataStore.cutVertices.length; i++){
        xVals.push(dataStore.cutVertices[i][0]);
        yVals.push(dataStore.cutVertices[i][1]);
    }

    CRUDarrays(
        ['/DAQ/analyzerGates/x', '/DAQ/analyzerGates/y'], 
        [xVals, yVals], 
        [7,7]
    )
}

function moveVertex(direction){
    // move vertex one step in <direction>== 'up' or 'down'
    // this == li node containing this vertex

    if(direction=='up'){
        this.parentElement.insertBefore(this, this.previousSibling)
    }else if(direction=='down'){
        this.parentElement.insertBefore(this.nextSibling, this)
    }

    extractCutVertices();
    dataStore.hm.render();
}

