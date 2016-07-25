// tools for performing specialized fits to n-component decays with know lifetimes + flat background
// relies on fitit.js

function fitMulticomponentDecayPlusFlatBkg(histo, min, max, xScale, lifetimes, amplitudeGuess, backgroundGuess, retries){
    var roi, fitter, result, i;

    if(!retries)
        retries = 0;

    roi=histo.slice(min, max);

    //ML fit to n-component decay curve with known lifetimes
    fitter = new histofit();
    for(i=min; i<max; i++)
        fitter.x[i-min] = (i+0.5)*xScale;
    fitter.y=roi;
    fitter.fxn = function(lifetimes, x, par){
        var i, activity = 0;

        for(i=0; i<lifetimes.length; i++){
            activity += par[i]*Math.exp(-x/lifetimes[i]);
        }

        return activity + par[i];
    }.bind(null, lifetimes);

    fitter.guess = amplitudeGuess.concat(backgroundGuess);
    fitter.fitit();

    //check if the fit failed, and redo with slightly nudged fit limits
    for(i=0; i<fitter.param.length; i++){
        if(!isNumeric(fitter.param[i]) && retries<10)
            return fitMulticomponentDecayPlusFlatBkg(histo, min+1, max-1, xScale, lifetimes, amplitudeGuess, backgroundGuess, retries+1)
    }

    result = {
        'min': min,
        'nBins': roi.length,
        'line': function(xScale, amplitudes, lifetimes, bkg, x){
            var i, activity = 0;

            for(i=0; i<amplitudes.length; i++){
                activity += amplitudes[i]*Math.exp(-x*xScale/lifetimes[i]);
            }

            return activity + bkg;
        }.bind(null, xScale, fitter.param.slice(0,fitter.param.length-1), lifetimes, fitter.param[fitter.param.length-1]),
        'amplitudes': fitter.param.slice(0,fitter.param.length-1),
        'bkg': fitter.param[fitter.param.length-1]
    }

    return result;
};

