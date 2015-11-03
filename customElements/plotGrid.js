xtag.register('x-plots', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('plotGrid').then(
                function(template){
                    if(dataStore.plots.length == 1)
                        this.innerHTML = Mustache.to_html(template, {
                            'singlePlot': dataStore.plots[0]
                        });
                    else
                        this.innerHTML = Mustache.to_html(template, {
                            'plots': dataStore.plots
                        });
                }.bind(this)
            )
        }
    },

    methods:{
        configure: function(){
            var i;

            for(i=0; i<dataStore.plots.length; i++){
                //create figures    
                this.createFigure(dataStore.plots[i]);

                //plug in attachment toggles
                document.getElementById(dataStore.plots[i] + 'attachAxis').onchange = this.attachCell    
            }

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
            dataStore.viewers[id] = new spectrumViewer(id);
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