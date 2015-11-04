xtag.register('x-footer', {
    lifecycle:{
        inserted: function(){
            //inject template
            promisePartial('footer').then(
                function(template){
                    this.innerHTML = Mustache.to_html(template, {});
                }.bind(this)
            )
        }
    }
});