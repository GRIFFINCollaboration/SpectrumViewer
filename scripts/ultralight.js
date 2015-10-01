function ultralight(partials, dataLoader, callback){
	var i;

	if(partials.constructor === Array){
		this.partials = partials;
	} else{
		this.partials = [];
	}

	if(typeof dataLoader === 'function')
		this.ulAuxilaryData = dataLoader;

	if(typeof callback === 'function')
		this.callback = callback;	

	this.parseQuery = function(queryString){
		//return an object with keys/values as per query string
		//note all values will be strings.

		var elts = {};
		var value, i;

		queryString = queryString.split('&');
		for(i=0; i<queryString.length; i++){
			value = queryString[i].split('=');
			elts[value[0]] = value[1];
		}

		return elts;

	}

	this.composeAuxilaryData = function(queryString){
		// given a query string, return an object that contains key / values corrseponding to the query data as strings,
		// plus any auxiliary data constructed by this.ulAuxilaryData.

		var auxdata, auxkey, 
			queryData = this.parseQuery(queryString);

		//add additional data as necessary
		if(typeof this.ulAuxilaryData === 'function'){
			auxdata = this.ulAuxilaryData(queryData)

			for(auxkey in auxdata){
				queryData[auxkey] = auxdata[auxkey];
			}
		}

		return queryData;		
	}

	this.generateHTML = function(){

		var template, html,
			queryData = this.composeAuxilaryData(window.location.search.substring(1))

		template = document.getElementById('body').innerHTML;
		html =  Mustache.to_html(template, queryData, this.partials);
		return html;

	}

	this.render = function(){
		//render the templates

		html = this.generateHTML();
		body = document.createElement('body');
		document.getElementsByTagName('body')[0].appendChild(body);
		document.body.innerHTML += html;
		return 0;
	}

	this.fetchTemplates = function(){
		// pull in all partials async, by the power of promises
		// then render page.

		var sequence = Promise.resolve();
		var partials = this.partials

		sequence.then(function(){
			return Promise.all(partials.map(this.ulUtilGet))
		}.bind(this)).then(function(partials){
			for(i=0; i<partials.length; i++){
				partial = document.createElement('script');
				partial.setAttribute('type', 'text/template');
				partial.setAttribute('id', this.partials[i]);
				partial.innerHTML = partials[i]
				document.getElementsByTagName('head')[0].appendChild(partial);
			}
			return this

		}.bind(this)).then(function(ul) {
			var i, key, hash, query, partials = {};
			
			//set up partials
			for(i=0; i<ul.partials.length; i++){
				partials[ul.partials[i]] = document.getElementById(ul.partials[i]).innerHTML;
			}
			ul.partials = partials;

			//render the route
			ul.render();

			return ul
		}).then(function(ul){
			//allow a post-rendering callback
			if(typeof ul.callback === "function"){
				ul.callback();
			}
		});
	}

	this.ulUtilGet = function(name){
		// promise to get tempate <name>; thanks http://www.html5rocks.com/en/tutorials/es6/promises/
		var rootURL, path;

		rootURL = window.location.protocol + "//" + window.location.host;
		path = window.location.pathname.split('/').slice(0,-1);
		for(i=0; i<path.length; i++){
			rootURL += path[i] + '/'
		}

		url = rootURL + 'partials/' + name + '.mustache';

		// Return a new promise.
	 	return new Promise(function(resolve, reject) {
			// Do the usual XHR stuff
	    	var req = new XMLHttpRequest();
	    	req.open('GET', url);

	    	req.onload = function() {
	      		// This is called even on 404 etc
	      		// so check the status
	      		if (req.status == 200) {
	        		// Resolve the promise with the response text
	        		resolve(req.response);
	      		}
	      		else {
	        		// Otherwise reject with the status text
	        		// which will hopefully be a meaningful error
	        		reject(Error(req.statusText));
	      		}
	    	};

		    // Handle network errors
		    req.onerror = function() {
	    		reject(Error("Network Error"));
	    	};

		    // Make the request
		    req.send();
	  	});
	}

}