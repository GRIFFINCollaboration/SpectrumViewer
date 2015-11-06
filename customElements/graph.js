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

            //listen for series on/off events
            this.addEventListener(
                'setDyVisible', 
                function(event){
                    this.setVisible(event.detail.index, event.detail.isVisible)
                }.bind(this), 
                false
            );
        }
    },

    methods:{
        configure: function(){
            this.initializePlot(dataStore.plotInitData, dataStore.plotStyle);
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

            var keys, i, annotations;

            this.dygraph.updateOptions( { 'file': event.detail.data } );

            //check for annotations to add
            //update annotations
            keys = Object.keys(dataStore.annotations)
            if(keys.length > 0 ){
                annotations = this.dygraph.annotations()
                for(i=0; i<keys.length; i++){
                    //mark up annotation with the right time
                    dataStore.annotations[keys[i]].x = event.detail.data[event.detail.data.length-1][0].getTime();
                    //add to list
                    annotations.push(dataStore.annotations[keys[i]]);
                }
                //set annotations on dygraph and dump the annotation buffer
                this.dygraph.setAnnotations(annotations)
                dataStore.annotations = {};
            }

        },

        setVisible: function(index, isVisible){
            this.dygraph.setVisibility(index, isVisible);
        }
    }

});