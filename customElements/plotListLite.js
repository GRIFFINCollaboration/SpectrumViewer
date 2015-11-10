xtag.register('x-plot-list-lite', {
    lifecycle:{
        inserted: function(){
            dataStore.allClear++;
            
            //inject template
            promisePartial('plotListLite').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {
                        'plotGroups': dataStore.plotGroups,
                        'id': this.id
                    });
                }.bind(this)
            ).then(
                function(){
                    dataStore.allClear--;   
                }
            )

            //listen for data update events
            this.addEventListener('fitAllComplete', this.snapToTop, false);
        }
    },

    methods:{
        configure: function(){

            var i, j;
            
            for(i=0; i<dataStore.plotGroups.length; i++){
                //plug in list toggles
                document.getElementById(this.id + dataStore.plotGroups[i].groupID).onclick = this.toggleSection.bind(this, dataStore.plotGroups[i].groupID, false);
                //plug in plot requests
                for(j=0; j<dataStore.plotGroups[i].plots.length; j++){
                    document.getElementById(this.id + dataStore.plotGroups[i].plots[j].plotID).onclick = this.exclusivePlot.bind(this, dataStore.plotGroups[i].plots[j].plotID+'_Energy', dataStore.viewers[dataStore.plots[0]]);
                }    
            }

        },

        toggleSection: function(groupID, suppressRecursion){
            //toggle a section group open or closed
            //<groupID>: string; name of expandable dropdown
            //<suppressRecursion>: bool; true -> prevent recursion
            //this: x-plot-list-lite object

            //close old list
            if(this.openList && !suppressRecursion && groupID!=this.openList){
                this.toggleSection(this.openList, true);
            }

            //allow manual close of old list
            if(groupID == this.openList)
                this.openList = null;
            else
                this.openList = groupID;

            document.getElementById(this.id + 'plots' + groupID).classList.toggle('hidden');
            document.getElementById(this.id + 'closed' + groupID).classList.toggle('hidden');
            document.getElementById(this.id + 'open' + groupID).classList.toggle('hidden');
        },

        exclusivePlot: function(plot, target){
            //plot the requested plot in target viewer, after removing all other plots found there
            //<plot>: string; name of spectrum from analyzer
            //<target>: string; spectrumViewer object to plot the plot in.
            //this: x-plot-list-lite object 

            //dump old data
            if(dataStore.currentPlot){
                target.removeData(dataStore.currentPlot);
                document.getElementById(this.id + 'badge' + dataStore.currentPlot.slice(0,10)).classList.add('hidden');
            }

            //add new data
            target.addData(plot, JSON.parse(JSON.stringify(dataStore.rawData[plot])) );
            document.getElementById(this.id + 'badge' + plot.slice(0,10)).classList.remove('hidden');
            target.fitTarget = plot;
            dataStore.currentPlot = plot;

            target.plotData();
        },

        snapToTop: function(){
            //reset display to first plot, first section
            //this: x-plot-list-lite object
            
            document.getElementById(this.id + dataStore.plotGroups[0].groupID).onclick();
            document.getElementById(this.id + dataStore.plotGroups[0].plots[0].plotID).onclick();

        }
    }

});
