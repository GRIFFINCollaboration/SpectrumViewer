xtag.register('x-rate-control', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('rateControl').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {
                        'id': this.id,
                        'gammas': dataStore.defaults.gammas,
                        'levels': dataStore.defaults.levels
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