xtag.register('x-graph', {
    lifecycle:{
        inserted: function(){
        
            var graph = document.createElement('div');
            var legend = document.createElement('div');

            //inject wrappers
            graph.setAttribute('id', this.id + 'Graph');
            this.appendChild(graph);
            legend.setAttribute('id', this.id + 'Legend');
            this.appendChild(legend);

            //listen for data update events
            this.addEventListener('updateDyData', this.updateData, false);
        }
    },

    methods:{
        configure: function(){
            this.initializePlot(dataStore.resolutionData, dataStore.plotStyle);
        },

        initializePlot: function(data, style){
            //set up a new plot.

            this.dygraph = new Dygraph(
                document.getElementById(this.id + 'Graph'),
                data,
                style
            );
        },

        updateData: function(event){
            //catch an event carrying new data, and update.
            
            this.dygraph.updateOptions( { 'file': event.detail.data } );
        }
    }

});