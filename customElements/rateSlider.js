xtag.register('x-rate-sliders', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('rateSliders').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {
                        'id': this.id
                    });
                }.bind(this)
            ).then(
                function(){
                    this.configure();
                    if(typeof templateCallback === "function")
                        templateCallback();
                }.bind(this)
            )
        }
    },

    methods:{
        configure: function(){
            //plug in inputs
            //document.getElementById(this.id + 'windowSlider').onchange = updateDygraph;
            document.getElementById(this.id + 'windowSlider').oninput = this.windowSliderCallback;
            document.getElementById(this.id + 'leadingEdgeSlider').oninput = this.leadingEdgeSliderCallback.bind(document.getElementById(this.id + 'leadingEdgeSlider'), this);
        },

        windowSliderCallback: function(){
            //oninput behavior of the window width slider
            //this: input range object

            var hours = Math.floor(parseInt(this.value, 10) / 60);
            var minutes = parseInt(this.value, 10) % 60;

            document.getElementById(this.id+'Value').innerHTML = hours + 'h:' + minutes +'m'
        },

        leadingEdgeSliderCallback: function(parent){
            //oninput behavior of the window leading edge slider
            //parent: x-rate-sliders object
            //this: input range object

            var seconds = parent.windowLeadingEdgeTime();
            var hours = Math.floor(seconds / (3600));
            var minutes = Math.floor((seconds % 3600) / 60);

            document.getElementById(parent.id+'leadingEdgeSliderValue').innerHTML = hours + 'h:' + minutes +'m ago'
            if(this.value == 0)
                document.getElementById(parent.id+'leadingEdgeSliderValue').innerHTML = 'now'
        },

        windowLeadingEdgeTime: function(){
            //returns number of seconds in the past the currently requested window leading edge is
            //this: x-rate-sliders object

            var leadingEdgeSlider = document.getElementById(this.id + 'leadingEdgeSlider');
            var first = dataStore.rateData[0][0];
            var last = dataStore.rateData[dataStore.rateData.length - 1][0];
            var history = -1 * parseInt(leadingEdgeSlider.value,10) / ( parseInt(leadingEdgeSlider.max,10) - parseInt(leadingEdgeSlider.min,10) );

            return Math.floor((last-first)*history / 1000);
        }

    }

});