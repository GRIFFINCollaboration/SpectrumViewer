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

where the nth SpecName matches a string in the array returned by `getSpectrumList`, returns a JSON object that contains an element of the form `name : array of bin contents` for each spectrum requested:

```
{'firstSpecName' : [0, 3, 2, 7, ...], 'nextSpecName' : [1,5,2,9, ...], ....}
```

If the named spectrum is not a valid spectrum, the return object above should contain an entry `'specName':null`.

## Engineering

All these projects are built on a collection on custom elements, which are in turn built on top of the [x-tag framework](https://x-tag.readme.io/). All of these components exchange information via a collection of [custom events](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events), as illustrated below. Layout is ala [Bootstrap](http://getbootstrap.com/), and client-side templating is built on [mustache.js](https://github.com/janl/mustache.js/).

### 0. Common Features

All these apps share some common design features:

 - Each app uses a global `dataStore` object to namespace global variables. `dataStore` is initialized by a function `setupDataStore`, called immediately in the head. **This is the appropriate place to add global variables.** Documentation on `dataStore` keys is found inline with their declaration. Most notably, `dataStore` contains a key `plots`, an array of strings which label the `gammaspectrum.js` plotting objects available, as well as the associated `x-plots` cells where they are drawn. Those plotting objects in turn live on an object `dataStore.viewers`, for easy global access by all elements.
 - Each app initializes itself via the *minimal* JavaScript in each root `.html` file; scripting should be kept to a minimum here, and encapsulated as methods on the custom elements wherever possible.
 - Network requests are done via a series of [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) and callbacks. When adding new network requests, **it is important to respect this pattern if you want responses to be dealt with at the correct time**. The pattern is:
   - All analyzer requests (per the spec above) are sent in parallel. Spectra are added to the appropriate plots and logged in the `dataStore` as they arrive.
   - On receipt of all analyzer info, all ODB requests are sent in parallel, and processed by the function `parseODB`.
   - After completion of all ODB requests, a global function `fetchCallback` is run, if it exists.

   This structure is found in `customElements/plotControl.js`, in `refreshAll()`, the central function responsible for orchestrating data refreshes over the network. In order to add an analyzer request, the appropriate URL must be added to the `queries` array found there; in order to add an ODB request, modify the string found in `dataStore.ODBrequests[0]`, per the ODB's [AJAX spec](https://midas.triumf.ca/MidasWiki/index.php/AJAX). In order to take action on reciept of ODB information, modify `parseODB()`; in order to take action immediately after all data has been refreshed, modify `fetchCallback()`.

### 1. Spectrum Viewer

![Spectrum viewer flow](img/spectrumViewer-flow.png)

The Spectrum Viewer elements communicate amongst themselves as above; nodes represent elements, and edges represent custom events. Basic behavior:

 - clicking on a spectrum name in `x-plot-list` fires a `requestPlot` event, which tells `x-plot-control` to queue up that histogram for plotting in all cells currently active, and subsequently dispatches an `addPlotRow` event to add a row to the appropriate tables in `x-aux-plot-control`.
 - `x-plot-control` governs data refresh as described in section 0.1.
 - `x-plots` fires `newCell` and `deleteCell` events at the control elements when a new plot is created or destroyed, to keep controls up to date; also, `attachCell` events are sent to `x-plot-control` to attach or unnattach the UI to each individual cell.




