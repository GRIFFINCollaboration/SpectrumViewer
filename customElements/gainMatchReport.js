xtag.register('x-gain-match-report', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('gainMatchReport').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {
                        'id': this.id,
                        'detectors': dataStore.GRIFFINdetectors
                    });
                }.bind(this)
            )
        }
    },

    methods:{

    }

});