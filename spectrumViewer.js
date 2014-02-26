//get a list of available spectra, and populate the appropriate menu
function populateSpectra(){

	var script = document.createElement('script');

	//little bit of setup first
	//get the header font right
	document.getElementById('headerBanner').style.fontSize = parseInt(document.getElementById('branding').offsetHeight, 10)*0.9+'px';

	//get the body font right
	document.body.style.fontSize = window.innerHeight*0.05/4+'px';	

	//scale the canvas - 1D
	document.getElementById('spectrumCanvas').setAttribute('width', parseInt(document.getElementById('canvasWrap').offsetWidth, 10)*0.95+'px');
	document.getElementById('spectrumCanvas').setAttribute('height', parseInt(document.getElementById('canvasWrap').offsetHeight, 10)*0.8+'px');

	//scale the canvas - 2D
	document.getElementById('fieldCanvas').setAttribute('width', parseInt(document.getElementById('canvasWrap2D').offsetWidth, 10)*0.95+'px');
	document.getElementById('fieldCanvas').setAttribute('height', parseInt(document.getElementById('canvasWrap2D').offsetHeight, 10)*0.8+'px');

	//fix the height of the canvas wrap and spectra list now that they're populated - allow height adjustments only on the recently viewed panel
	document.getElementById('canvasWrap').style.height = document.getElementById('canvasWrap').offsetHeight;
	document.getElementById('sidebarWrap').style.height = document.getElementById('sidebarWrap').offsetHeight;
	document.getElementById('canvasWrap2D').style.height = document.getElementById('canvasWrap').offsetHeight;
	document.getElementById('sidebarWrap2D').style.height = document.getElementById('sidebarWrap').offsetHeight;

	//scale the x-deck
	updateDeckHeight();

	//set up a spectrum viewer - 1D
	viewer = new spectrumViewer('spectrumCanvas');

	//set up a field viewer - 2D
	fieldViewer = new fieldViewer('fieldCanvas');
	//dummy data in the 2D canvas for now
	fieldViewer.plotBuffer = fieldViewer.fakeData.gaussian;
	fieldViewer.plotData();


	script.setAttribute('src', 'http://annikal.triumf.ca:9093/?cmd=getSpectrumList');
	script.onload = function(){
		deleteDOM('spectraList');
		main();
	}
	script.id = 'spectraList';
	document.head.appendChild(script);
};

//fetch one spectrum from the server
function fetchSpectrum(name, callback){
	var script;

	//get data from server:
	script = document.createElement('script');
	script.setAttribute('src', 'http://annikal.triumf.ca:9093/?cmd=callspechandler&spectrum1='+name);
	if(callback) script.onload = callback
	script.id = 'fetchdata';

	document.head.appendChild(script);
}

//refresh all spectra from server
function fetchAllSpectra(callback){
	var i, URL = 'http://annikal.triumf.ca:9093/?cmd=callspechandler&';

	for(i=0; i<spectraNames.length; i++){
		URL += 'spectrum'+i+'='+spectraNames[i];
		if(i != spectraNames.length-1)
			URL += '&';
	}

	//get data from server:
	script = document.createElement('script');
	script.setAttribute('src', URL);
	script.onload = function(callback){
		var key;
		//manage the viewer object, doesn't exist until main runs the first time through
		if(callback != main){
			//push relevant data to the viewer's buffer, except the first time when we're calling back to main:
			for(key in viewer.plotBuffer)
				viewer.addData(key, spectrumBuffer[key]);

			//replot
			viewer.plotData();
		}
		//dump the script so they don't stack up:
		deleteDOM('fetchdata');

		//callback
		if(callback)
			callback();
	}.bind(null, callback);
	script.id = 'fetchdata'

	document.head.appendChild(script);
}

//refresh spectra that are currently available for plotting
function refreshSpectra(){
	var i, key, URL = 'http://annikal.triumf.ca:9093/?cmd=callspechandler';

	i=0;
	for(key in spectrumBuffer){
		URL += '&spectrum'+i+'='+key;
		i++;
	}

	//get data from server:
	if(i!=0){
		script = document.createElement('script');
		script.setAttribute('src', URL);
		script.onload = function(callback){
			var key;
			//push relevant data to the viewer's buffer
			for(key in viewer.plotBuffer){
				viewer.addData(key, spectrumBuffer[key]);
			}
			//dump the script so they don't stack up:
			deleteDOM('fetchdata');

			viewer.plotData();
		};
		script.id = 'fetchdata'
		document.head.appendChild(script);
	} else
		viewer.plotData();
}

//deploy a new histo to the viewer: fetch it, draw it, and populate the recently viewed list
function addSpectrum(name){

	//get the spectrum
	fetchSpectrum(name, function(name){

		//append to spectrum viewer's data store:
		viewer.addData(name, spectrumBuffer[name]);

		//redraw the spectra
		viewer.plotData();
		viewer.unzoom();

		//add to recently viewed list
		addRow(name);

		//resize the xdeck
		updateDeckHeight();
	}.bind(null, name));
	
};

//add a row to the recently viewed table
function addRow(name){

	if(document.getElementById('recent'+name))
		return;

	//wrapper
	injectDOM('div', 'recent'+name, 'recentSpectra', {'class':'recentWrap'});

	//color swatch
	injectDOM('div', 'color'+name, 'recent'+name, {'class':'colorSwatch', 'style':'background-color:'+viewer.dataColor[viewer.colorAssignment.indexOf(name)]});

	//name
	injectDOM('div', 'name'+name, 'recent'+name, {'class':'recentName', 'innerHTML':name});

	//toggle
	toggleSwitch('recent'+name, 'toggle'+name, 'x', 'Show', 'Hide', viewer.toggleSpectrum.bind(viewer, name, false), viewer.toggleSpectrum.bind(viewer, name, true), 1);

	//fit target
	injectDOM('div', 'fitTargetWrap'+name, 'recent'+name, {'class':'fitTargetWrap'})
	injectDOM('input', 'fitTargetRadio'+name, 'fitTargetWrap'+name, {'type':'radio', 'name':'fitTarget', 'checked':true, 'class':'fitTargetRadio', 'value':name});
	injectDOM('label', 'fitTarget'+name, 'fitTargetWrap'+name, {'for':'fitTargetRadio'+name});
	document.getElementById('fitTargetRadio'+name).onchange = function(){
		viewer.fitTarget = document.querySelector('input[name="fitTarget"]:checked').value;
	}
	viewer.fitTarget = document.querySelector('input[name="fitTarget"]:checked').value;


	//fit results
	injectDOM('div', 'fit'+name, 'recent'+name, {'class':'fitResults', 'innerHTML':'-'})

	//kill button
	injectDOM('div', 'kill'+name, 'recent'+name, {'class':'killSwitch', 'innerHTML':String.fromCharCode(0x2573)});
	document.getElementById('kill'+name).onclick = function(){
		var name = this.id.slice(4,this.id.length);

		//remove the data from the viewer buffer
		viewer.removeData(name);
		//kill the row in the recents table
		deleteDOM('recent'+name);
		//also remove the data from the plot buffer to prevent periodic re-fetch:
		delete spectrumBuffer[name];
		//unzoom the spectrum
		viewer.unzoom();
		//shrink the deck height
		updateDeckHeight();
	};


};

//handle the server callback, currently hardcoded as callSpectrumHandler
function callSpectrumHandler(data){

	var key, response;
	
	for(key in data){
		spectrumBuffer[key] = [];
		for(i=0; i<data[key].length; i++)
			spectrumBuffer[key][i] = data[key][i];
	}
	
};

//handle the spectrum list fetch, currently hardcoded as getSpectrumList
function getSpectrumList(data){

	var i,
		spectrumList = document.getElementById('availableSpectra'),
		listElement;

	spectraNames = [];
	for(i=0; i<data.spectrumlist.length; i++)
		spectraNames[i] = data.spectrumlist[i];

	//create a list in the sidebar
	spectrumList.innerHTML = '';  //dump old entries first
	for(i=0; i<spectraNames.length; i++){
		listElement = document.createElement('li');
		listElement.id = spectraNames[i];
		spectrumList.appendChild(listElement);
		document.getElementById(spectraNames[i]).innerHTML = spectraNames[i];
		document.getElementById(spectraNames[i]).onclick = addSpectrum.bind(null, spectraNames[i]) ;
	}
}

//callback for peak fit
function fitCallback(center, width){
	var name = viewer.fitTarget,
		reportDiv = document.getElementById('fit'+name);

	if(reportDiv.innerHTML == '-')
		reportDiv.innerHTML = '';

	reportDiv.innerHTML += 'Center: ' + center.toFixed(2) + ', Width: ' + width.toFixed(2) + '<br>';
}













//DOM injector; <properties> is an object containing property.value pairs for all properties to be set: 
function injectDOM(element, id, wrapperID, properties){
    var key, elt,
        newElement = document.createElement(element);
    //explicit ID
    newElement.setAttribute('id', id);
    //append to document:
    if(wrapperID == 'body')
        document.body.appendChild(newElement)
    else
        document.getElementById(wrapperID).appendChild(newElement);
    elt = document.getElementById(id);

    //some things need to be set specially:
    if(properties['innerHTML'] || properties['innerHTML'] === 0){
        elt.innerHTML = properties['innerHTML'];
        delete properties['innerHTML'];
    }
    if(properties['onclick']){
        elt.onclick = properties['onclick'];
        delete properties['onclick'];
    }
    //send in the clowns:
    for(key in properties){
        elt.setAttribute(key, properties[key]);
    }

};

//delete a dom element by ID
function deleteDOM(id){
	var element = document.getElementById(id);
    element.parentNode.removeChild(element);
};

//build a toggle switch out of divs:
function toggleSwitch(parentID, id, title, enabled, disabled, onActivate, onDeactivate, initialState){

	//wrapper div:
	injectDOM('div', 'toggleWrap'+id, parentID, {'class':'toggleWrap', 'style':( (title=='') ? 'text-align:center;' : '' )});
	//label: (hacked in here, usually only the first one and only on title argument)
	if(disabled != '')
		injectDOM('div', 'LtoggleLabel'+id, 'toggleWrap'+id, {'class':'toggleLabel', 'innerHTML':disabled});
	//toggle groove:
	injectDOM('div', 'toggleGroove'+id, 'toggleWrap'+id, {'class':'toggleGroove', 'style':( (title=='') ? '' : 'float:left;' )});
	//extra hack-in label:
	if(disabled != '')
		injectDOM('div', 'RtoggleLabel'+id, 'toggleWrap'+id, {'class':'toggleLabel', 'innerHTML':enabled});
	//toggle switch:
	injectDOM('div', 'toggleSwitch'+id, 'toggleGroove'+id, {'class':'toggleSwitch', 'style':((initialState) ? 'left:1em;' : 'left:0em;')});
	document.getElementById('toggleSwitch'+id).onmousedown = function(event){
		document.getElementById('toggleWrap'+id).ready = 1;
	};
	document.getElementById('toggleSwitch'+id).onmouseup = function(event){
		flipToggle(event, id, enabled, disabled, onActivate, onDeactivate);
	};
	document.getElementById('toggleSwitch'+id).onmouseout = function(event){
		flipToggle(event, id, enabled, disabled, onActivate, onDeactivate)
	};
	//state description
	/*
	if(title=='')
		injectDOM('br', 'break', 'toggleWrap'+id, {});
	injectDOM('div', 'toggleDescription'+id, 'toggleWrap'+id, {
		'class' : 'toggleDescription',
		'style' : ( (title=='') ? 'width:100%' : '' ),
		'innerHTML' : ((initialState) ? enabled : disabled)
	})
	*/

};

function flipToggle(event, id, enabled, disabled, onActivate, onDeactivate){
	var switchID = 'toggleSwitch'+id,
	//grooveID = 'toggleGroove' + id,
	descriptionID = 'toggleDescription' + id;
	if(document.getElementById('toggleWrap'+id).ready != 1) return

	if(document.getElementById(switchID).style.left == '0em'){
		document.getElementById(switchID).style.left = '1em';
		//document.getElementById(descriptionID).innerHTML = enabled;
		onActivate();
	} else{
		document.getElementById(switchID).style.left = '0em';
		//document.getElementById(descriptionID).innerHTML = disabled;
		onDeactivate();
	}

	document.getElementById('toggleWrap'+id).ready =0;	
}

//set a toggle to the state given by the boolean activate
function setToggle(toggleID, activate){
	var toggle = document.getElementById(toggleID);
	if( (activate && toggle.style.left == '0em') || (!activate && toggle.style.left == '1em') ){
		toggle.onmousedown();
		toggle.onmouseup();
	}
}

function queryString(){
	var query = window.location.search.substring(1),
		i, buffer;

	queryVars = {};

	query = query.split('&')

	for(i=0; i<query.length; i++){
		queryVars[query[i].split('=')[0]] = query[i].split('=')[1] ;
	}
}

//x-deck needs its height babysat - todo: CSS solution?
function updateDeckHeight(){
	document.getElementById('mainDeck').style.height = document.getElementById('canvasWrap').offsetHeight + document.getElementById('recentSpectra').offsetHeight + parseFloat(document.body.style.fontSize)*3; //ie 3 ems worth of margins
}


