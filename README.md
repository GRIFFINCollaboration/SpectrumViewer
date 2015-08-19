SpectrumViewer
==============

A spectrum viewer for the GRIFFIN collaboration, based on our gammaSpectrum package.

####Setup

Have a look near the bottom of `index.html` - there should be a variable `window.baseURL`; this should be set to the URL your JSON spectrum data is being posted at, with the beginning of a query string, like to `'http://your.server.xy:9093/?cmd='`

Your server must listen for the following requests, and serve the corresponding responses:

`cmd=getSpectrumList`

Returns an array of all available spectrum names in the format:
```
getSpectrumList({'spectrumlist':['firstSpectrum', 'nextSpectrum', ..., 'lastSpectrum']})
```

`cmd=callspechandler&spectrum0&spectrum1&...`

Returns a JSON object that contains an element of the form `name : array of bin contents` for each `&spectrum<n>` concatenated onto the query string, wrapped in a `callSpectrumHandler` function:

```
callSpectrumHandler({'nameOfFirstSpectrum' : [0, 3, 2, 7], 'nameOfNextSpectrum' : [9,9,9,9], ....})
```

If a query argument `&specName` is passed where `specName` is not a valid spectrum, the return object above should contain an entry `'specName':null`