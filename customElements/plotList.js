xtag.register('x-plot-list', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('plotList').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {'topGroups': dataStore.topGroups});
                }.bind(this)
            )
        }
    },

    methods:{
        configure: function(){
            //plug in UI
            var i, plotSelectorSections, plotToggles;
         
            //set up plot selection top row
            plotSelectorSections = document.getElementsByClassName('topRowSection')
            for(i=0; i<plotSelectorSections.length; i++){
                plotSelectorSections[i].onclick = this.selectMenuSection;
            }

            //set up plot list clicks
            plotToggles = document.getElementsByClassName('dd-item')
            for(i=0; i<plotToggles.length; i++){
                plotToggles[i].onclick = this.selectPlot.bind(this, plotToggles[i].id);
            }            
        },

        selectMenuSection: function(){
            //select the top level menu tab
            //this: x-plot-list object
            if(dataStore.currentSubrow){
                document.getElementById(dataStore.currentSubrow).classList.toggle('hidden')
                document.getElementById('tab' + dataStore.currentSubrow.slice(6)).classList.toggle('active')

            }
            document.getElementById('subrow' + this.id).classList.toggle('hidden')
            document.getElementById('tab' + this.id).classList.toggle('active')
            dataStore.currentSubrow = 'subrow' + this.id;
        },

        selectPlot: function(plotName, e){
            //dispatch an event carrying the requested plot name on click of a dropdown element.
            //<plotName>: string; name of plot requested from analyzer
            //<e>: event; onclick.

            //don't close the dd onclick:
            e.stopPropagation();

            dispatcher({ 'plotName': plotName }, dataStore.plotNameListeners, 'requestPlot');

        }
    }
});