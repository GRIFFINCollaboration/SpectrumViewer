//get a list of available spectra, and populate the appropriate menu
function populateSpectra(){

	var script = document.createElement('script');

	//little bit of setup first
	//get the header font right
	document.getElementById('headerBanner').style.fontSize = parseInt(document.getElementById('branding').offsetHeight, 10)*0.9+'px';

	//scale the canvas
	document.getElementById('spectrumCanvas').setAttribute('width', parseInt(document.getElementById('canvasWrap').offsetWidth, 10)*0.95+'px');
	document.getElementById('spectrumCanvas').setAttribute('height', parseInt(document.getElementById('canvasWrap').offsetHeight, 10)*0.8+'px');

	//set up a spectrum viewer
	viewer = new spectrumViewer('spectrumCanvas');

	script.setAttribute('src', 'http://annikal.triumf.ca:9093/?cmd=getSpectrumList');
	script.onload = function(){
		deleteDOM('spectraList');
		fetchAllSpectra(main);
	}
	script.id = 'spectraList';
	document.head.appendChild(script);

};

//refresh a spectrum from the server
function fetchSpectrum(name){
	var script;

	//get data from server:
	script = document.createElement('script');
	script.setAttribute('src', 'http://annikal.triumf.ca:9093/?cmd=callspechandler&spectrum1='+name);
	script.onload = addSpectrum.bind(null, name);
	script.id = 'fetchdata'

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

//deploy a new histo to the viewer: draw it, and populate the recently viewed list
function addSpectrum(name){

	//var data, i;
	//get data from server:
	/*
	data = [];
	for(i=0; i<500; i++)
		data[i] = Math.round(100*Math.random());
	*/

	//append to spectrum viewer's data store:
	viewer.addData(name, spectrumBuffer[name]);

	//redraw the spectra
	viewer.plotData();
	viewer.unzoom();

	//add to recently viewed list
	addRow(name);
	
};

//add a row to the recently viewed table
function addRow(name){


	//wrapper
	injectDOM('div', 'recent'+name, 'recentSpectra', {'class':'recentWrap'});

	//color swatch
	injectDOM('div', 'color'+name, 'recent'+name, {'class':'colorSwatch', 'style':'background-color:'+viewer.dataColor[viewer.colorAssignment.indexOf(name)]});

	//name
	injectDOM('div', 'name'+name, 'recent'+name, {'class':'recentName', 'innerHTML':name});

	//toggle
	toggleSwitch('recent'+name, 'toggle'+name, 'x', 'Show', 'Hide', viewer.toggleSpectrum.bind(viewer, name, false), viewer.toggleSpectrum.bind(viewer, name, true), 1);

	//kill button
	injectDOM('div', 'kill'+name, 'recent'+name, {'class':'killSwitch', 'innerHTML':String.fromCharCode(0x2573)});
	document.getElementById('kill'+name).addEventListener('click', function(){
		var name = this.id.slice(4,this.id.length);

		viewer.removeData(name);
		deleteDOM('recent'+name);

		viewer.plotData();
	});

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
		document.getElementById(spectraNames[i]).addEventListener('click', addSpectrum.bind(null, spectraNames[i]) );
	}
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