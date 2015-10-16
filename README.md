Spectrum Viewer
===============

A collection of remixable spectrum analysis tools.

## Setup

The Spectrum Viewer pages can be served as static pages from gh-pages, or anywhere you like. `server.js` provides a minimal node server that will do the job; dependencies and setup are at the top of that file.

## Data Feeds

All these tools rely on being able to query spectrum data from a server providing JSON reponses. The expected API is as follows:

`?cmd=getSpectrumList`

Returns an array of all available spectrum names in the format:
```
getSpectrumList({'spectrumlist':['firstSpectrum', 'nextSpectrum', ..., 'lastSpectrum']})
```

`?cmd=callspechandler&spectrum0=firstSpecName&spectrum1=nextSpecName&...`

where the nth SpecNames match a string in the array returned by `getSpectrumList` returns a JSON object that contains an element of the form `name : array of bin contents` for each spectrum requested:

```
{'firstSpecName' : [0, 3, 2, 7], 'nextSpecName' : [1,5,2,9], ....}
```

If the named spectrum is not a valid spectrum, the return object above should contain an entry `'specName':null`.

## Engineering

### 0. Ultralight

All these tools are built using the [Ultralight framework](https://github.com/BillMills/ultralight) for simple templating and query string handling. Check out their page for a tutorial on how to use Ultralight - necessary for understanding the engineering in this project.

### 1. Spectrum Viewer

The core app in this collection is the spectrum viewer tool, in `spectrumViewer.html`. It supports general visualization of all spectra returned by a server as described in the Data Feeds section, above.

#### Setup

Beside serving the project as a static site, the only thing to configure for GRIFFIN is the base URL of the server providing the JSON spectra. Set this in `scripts/spectrumViewer.js` in the `setupDataStore` function, under the `dataStore.spectrumServer` variable, and in the `getSpectrumList` script tag in the head of `spectrumViewer.html`. Other projects with an analogous server will need to adapt the logic below to their infrastructure - but the pattern remains the same.

#### Basic Logic

The spectrum viewer sets itself up via the following steps:

 - In the head, `<script src='http://grsmid00.triumf.ca:9093/?cmd=getSpectrumList'></script>` fetches the list of all avialable spectra, and initializes the data store. Note that this data store object is the correct place to put any global variables you'd like to add.
 - After the initial scripts are loaded, Ultralight sets up the page after calling `dataSetup` in `scripts/spectrumViewer.js`; this function's only job is to identify the groups of plots to arrange under dropdowns in the plot selection menu, as a function of the plot names provided. This is configured for GRIFFIN **and will need to be rewritten for another project**.
 - After setup is complete, `pageLoad` in `scripts/spectrumViewer.js` configures the UI; this is the appropriate place to do things that need doing after the page is set up.

Spectrum viewer ingests data via the operations wrapped by the `refreshPlots` function in `scripts/plotSpectraHelpers.js`; the flow looks like:

 - `constructQueries` returns an array of URL strings that match the Data Feeds spec for fetching spectrum data. This is the appropriate place to add in requests for additional data or from additional sources.
 - Every element of this array is input individually into `promiseJSONURL`, which returns a promise to fetch the response of that URL as a JSON object. Once all those promises resolve, the spectra are added to the spectrum viewer's dataset, and `fetchCallback` is called to draw the plot. `fetchCallback` is the appropriate place to add actions immediately following data refresh. 




