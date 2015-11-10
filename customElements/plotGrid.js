xtag.register('x-plots', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('plotGrid').then(
                function(template){

                    var i, wrapper, newPlot;

                    //save the template for later
                    dataStore.cellTemplate = template;
                    
                    //set up a wrapper for plots
                    wrapper = document.createElement('div');
                    wrapper.setAttribute('id', this.id + 'plotWrap');
                    this.appendChild(wrapper);

                    //set up fancy new plot button
                    newPlot = document.createElement('span');
                    newPlot.setAttribute('class', 'glyphicon glyphicon-plus-sign newPlotButton');
                    newPlot.setAttribute('id', this.id + 'newPlotButton');
                    newPlot.onclick = this.manageCellCreation.bind(this);
                    this.appendChild(newPlot);

                    //generate an appropriate number of plots
                    for(i=0; i<dataStore.plots.length; i++){
                        this.addCell(dataStore.plots[i]);
                    }

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
            //make sure things are arranged nicely for the number of plots presented initially
            this.manageCellControl();
        },

        determineColSize: function(){
            //determine an appropriate bootstrap column width.
            //1 plot == 1 col
            //2-5 plots == 2 cols
            //6+ plots == 3 cols

            var colSize = 12
            if(dataStore.plots.length > 1 && dataStore.plots.length < 6)
                colSize = 6
            else if(dataStore.plots.length >= 6)
                colSize = 4

            return colSize
        },

        addCell: function(label){
            //add a cell to the display.
            //<label>: string key for this cell and corresponding viewer object
            //assumes label has already been added to dataStore.plots
            //this: x-plots object

            //generate html
            var cell = document.createElement('div');
            var colSize = this.determineColSize();
            cell.setAttribute('class', 'plotCell col-md-'+colSize);
            cell.setAttribute('id', this.id + label + 'Cell');

            cell.innerHTML = Mustache.to_html(dataStore.cellTemplate, {
                'label': label,
                'id': this.id
            });
            document.getElementById(this.id + 'plotWrap').appendChild(cell);

            //initialize plot
            this.createFigure(label);

            //plug in attachment toggles
            document.getElementById(this.id + label + 'attachAxis').onchange = this.attachCell;

            //plug in delete button
            document.getElementById(this.id + label + 'Delete').onclick = this.deleteCell.bind(this, label);
        },

        manageCellCreation: function(){
            //top level wrapper for adding a new cell
            //adds the cell, updates global datastore and dispatches events to announce presence of new cell

            var label, evt;

            //generate new label for cell
            label = 'Cell' + dataStore.cellIndex;
            dataStore.cellIndex++;
            dataStore.plots.push(label);

            //insert new dom guts
            this.addCell(label);

            //make sure the columns are an appropriate size & UI is displayed correctly
            this.manageFigureSizes();
            this.manageCellControl();

            //report new cell to listeners
            dispatcher(
                { 
                    'cellName': label,
                    'state': true //attached / active by default
                }, 
                dataStore.newCellListeners, 
                'newCell'
            )
        },

        manageFigureSizes: function(){
            //rescale figures as appropriate
            var colSize = this.determineColSize();
            var colClass = 'plotCell col-md-' + colSize;
            var i, cell;
            var canvas, width, height;

            for(i=0; i<dataStore.plots.length; i++){
                cell = document.getElementById(this.id + dataStore.plots[i] + 'Cell');
                cell.setAttribute('class', colClass);
                this.createFigure(dataStore.plots[i]);
            }
        },

        manageCellControl: function(){
            //cell control shouldn't be presented if there's only one cell.

            var i, nCells = dataStore.plots.length;

            if(nCells == 1){
                //make sure the one remaining cell is attached to the ui
                document.getElementById(this.id + dataStore.plots[0] + 'attachAxis').checked = true;
                this.attachCell.bind(document.getElementById(this.id + dataStore.plots[0] + 'attachAxis'))();

                //hide cell attachment ui
                document.getElementById(this.id + dataStore.plots[0] + 'Control').classList.add('hidden');
            } else{
                //unhide cell attachment ui
                for(i=0; i<nCells; i++){
                    document.getElementById(this.id + dataStore.plots[i] + 'Control').classList.remove('hidden');
                }
            }
        },

        deleteCell: function(cell){
            //handle dropping a cell
            //<cell>: string; name of cell, per ids in dataStore.plots.
            //this. x-plots object
            var evt;

            deleteNode(this.id + cell + 'Cell');
            delete dataStore.viewers[cell];
            dataStore.plots.splice(dataStore.plots.indexOf(cell), 1);

            dispatcher({ 'cellName': cell }, dataStore.deleteCellListeners, 'deleteCell');

            this.manageFigureSizes();
            this.manageCellControl();
        },

        createFigure: function(id){
            //set up a canvas with id, and corresponding viewer object
            //<id>: string; name of viewer, same as name of corresponding cell, as found in dataStore.plots.

            var canvas = document.getElementById(id);
            var width = canvas.parentElement.offsetWidth
            var height = 2/3*width;

            canvas.width = width;
            canvas.height = height;

            if(!dataStore.viewers)
                dataStore.viewers = {};
            if(!dataStore.viewers[id]){
                dataStore.viewers[id] = new spectrumViewer(id);
            } else{
                dataStore.viewers[id].rescale();
            }

            dataStore.viewers[id].plotData();
        },

        attachCell: function(e){
            //dispatch an event carrying the cell in question and its attachment state 
            //<e>: event; onchange.
            //this: input type=checkbox element.

            dispatcher(
                { 
                    'cellName': this.value,
                    'state': this.checked 
                }, 
                dataStore.attachCellListeners, 
                'attachCell'
            )
        }
    }

});