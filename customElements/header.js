xtag.register('x-header', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('header').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {
                        "title": dataStore.pageTitle
                    });
                }.bind(this)
            )
        }
    }
});