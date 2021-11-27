////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    dataStore = {
        ODBhost: 'http://grifstore0.triumf.ca:8081/',                 //MIDAS / ODB host + port
        sourceNamesDir: '/Equipment/Epics/Settings/Names',             //ODB array holding names of things to populate striptool with
        sourceDataDir: '/Equipment/Epics/Variables/MSRD'           //ODB array with data to plot in striptool corresponding to sourceNames
    }
}
setupDataStore();
