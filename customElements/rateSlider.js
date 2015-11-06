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
            )

            //listen for data update events
            //this.addEventListener('fitAllComplete', this.snapToTop, false);
        }
    },

    methods:{
        configure: function(){
        }

    }

});