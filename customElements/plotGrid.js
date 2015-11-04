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
                    newPlot.onclick = this.manageCellCreation.bind(this);
                    this.appendChild(newPlot);

                    //generate an appropriate number of plots
                    for(i=0; i<dataStore.plots.length; i++){
                        this.addCell(dataStore.plots[i]);
                    }
                }.bind(this)
            )
        }
    },

    methods:{
        configure: function(){


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
            //assumes label has already been added to dataStore.plots

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

            //make sure the columns are an appropriate size
            this.manageFigureSizes();

            //report new cell to listeners
            evt = new CustomEvent('newCell', {
                detail: { 
                    'cellName': label, 
                },
                cancelable: true
            });
            dataStore.newCellListeners.map(function(id){
                document.getElementById(id).dispatchEvent(evt);
            });

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

        deleteCell: function(cell){
            //handle dropping a cell
            var evt;

            deleteNode(this.id + cell + 'Cell');
            delete dataStore.viewers[cell];
            dataStore.plots.splice(dataStore.plots.indexOf(cell), 1);

            evt = new CustomEvent('deleteCell', {
                detail: { 
                    'cellName': cell 
                },
                cancelable: true
            });
            dataStore.deleteCellListeners.map(function(id){
                document.getElementById(id).dispatchEvent(evt);
            });

            this.manageFigureSizes();
        },

        createFigure: function(id){
            //set up a canvas with id, and corresponding viewer object

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

            var evt = new CustomEvent('attachCell', {
                detail: { 
                    'cellName': this.value,
                    'state': this.checked 
                },
                cancelable: true
            });
            dataStore.attachCellListeners.map(function(id){
                document.getElementById(id).dispatchEvent(evt);
            });
        }
    }

});