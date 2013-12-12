//get a list of available spectra, and populate the appropriate menu
function populateSpectra(){

	var spectraNames, i, 
		spectrumList = document.getElementById('availableSpectra'),
		listElement;

	//get spectra names
	spectraNames = ['dummy1', 'dummy2', 'dummy3'];

	//create a list in the sidebar
	spectrumList.innerHTML = '';  //dump old entries first
	for(i=0; i<spectraNames.length; i++){
		listElement = document.createElement('li');
		listElement.id = spectraNames[i];
		spectrumList.appendChild(listElement);
		document.getElementById(spectraNames[i]).innerHTML = spectraNames[i];
		document.getElementById(spectraNames[i]).addEventListener('click', addSpectrum.bind(null, spectraNames[i]) );
	}
};

//deploy a new histo to the viewer: load it, draw it, and populate the recently viewed list
function addSpectrum(name){

	var data, i;

	//get data from server:
	data = [];
	for(i=0; i<500; i++)
		data[i] = Math.round(100*Math.random());

	//append to spectrum viewer's data store:
	viewer.addData(name, data);

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