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
                this.createFigure(dataStore.plots[i]);
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
        }
    }

});