////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    var i,j,k
    var griffinQuads = ['B', 'G', 'R', 'W'];
    var griffinCodes = []
    var grifBGOCodes = []
    var sceptarCodes = []
    var pacesCodes = []
    var labr3Codes = []
    var labBGOCodes = []
    var tacCodes = []
    var descantCodes = []
    var ogsCodes = []

    //generate GRIFFFIN detector nomenclature codes
    for(i=1; i<17; i++){
        for(j=0; j<griffinQuads.length; j++){
            griffinCodes.push('GRG' + alwaysThisLong(i,2) + griffinQuads[j] + 'N00A');
        }
    }
    for(i=1; i<17; i++){
        for(j=0; j<griffinQuads.length; j++){
            griffinCodes.push('GRG' + alwaysThisLong(i,2) + griffinQuads[j] + 'N00B');
        }
    }

    //generate GRIFFFIN BGO detector nomenclature codes
    for(i=1; i<17; i++){
        for(j=0; j<griffinQuads.length; j++){
            for(k=1; k<6; k++){
		grifBGOCodes.push('GRS' + alwaysThisLong(i,2) + griffinQuads[j] + 'N'+ alwaysThisLong(k,2) + 'X');
	    }
        }
    }
    
    //generate SCEPTAR detector nomenclature codes
    sceptarCodes.push('ZDS01XN00A');
    sceptarCodes.push('ZDS01XN00B');
    for(i=1; i<21; i++){
        sceptarCodes.push('SEP' + alwaysThisLong(i,2) + 'XN00X');
    }

    //generate PACES detector nomenclature codes
    for(i=1; i<6; i++){
        pacesCodes.push('PAC' + alwaysThisLong(i,2) + 'XN00A');
    }

    //generate LaBr3 detector nomenclature codes
    for(i=1; i<9; i++){
        labr3Codes.push('LBL' + alwaysThisLong(i,2) + 'XN00X');
    }

    //generate LaBr3 detector nomenclature codes
    for(i=1; i<9; i++){
        labBGOCodes.push('LBS' + alwaysThisLong(i,2) + 'AN00X');
        labBGOCodes.push('LBS' + alwaysThisLong(i,2) + 'BN00X');
        labBGOCodes.push('LBS' + alwaysThisLong(i,2) + 'CN00X');
    }

    //generate LaBr3 TACs detector nomenclature codes
    for(i=1; i<9; i++){
        tacCodes.push('LBT' + alwaysThisLong(i,2) + 'XT00X');
    }

    //generate DESCANT detector nomenclature codes
    for(i=1; i<89; i++){
	if(i>70 && i<80){ continue; }
        descantCodes.push('DSC' + alwaysThisLong(i,2) + 'XN00X');
    }

    //generate OGS detector nomenclature codes
    for(i=1; i<9; i++){
        ogsCodes.push('OGS' + alwaysThisLong(i,2) + 'XP00X');
    }
    for(i=1; i<9; i++){
        ogsCodes.push('OGS' + alwaysThisLong(i,2) + 'XN00X');
    }

    //declare top level groups
    var topGroups = [
        {
            "name": "Hit Patterns & Sums",
            "id": "hitsAndSums",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Hit Patterns",
                    "id": "hits",
                    "items": [
                        'HITPATTERN_Energy',
                        'HITPATTERN_Time',
                        'HITPATTERN_Waveform',
                        'HITPATTERN_Pulse_Height',
                        'HITPATTERN_Rate'
                    ]
                },
                {
                    "subname": "Sum Spectra",
                    "id": "sums",
                    "items": [
                        'SUM_Singles_GeA_Energy',
                        'SUM_Singles_GeB_Energy',
                        'SUM_Addback_Energy',
                        'SUM_PACES_Energy',
                        'SUM_LaBr3_Energy',
                        'SUM_BGO_Energy',
                        'SUM_LBGO_Energy',
                        'SUM_Singles_GeA_E_PUreject',
                        'SUM_Singles_GeA_E_PUonly',
                        'SUM_LaBr3_E_PUreject',
                        'SUM_LaBr3_E_PUonly'
                    ]
                },
                {
                    "subname": "Coinc. Spectra",
                    "id": "coinc",
                    "items": [
			'COINC_gamma-gamma',
			'COINC_beta-gamma',
			'COINC_beta-PACES',
			'COINC_gamma-PACES',
			'COINC_beta-Addback',
			'COINC_beta-LaBr3',
			'COINC_LaBr3-LaBr3'
                    ]
                },
                {
                    "subname": "deltaT. Spectra",
                    "id": "deltaT",
                    "items": [
			'deltaT_gamma-gamma',
			'deltaT_beta-gamma',
			'deltaT_beta-PACES',
			'deltaT_gamma-PACES',
			'deltaT_beta-Addback',
			'deltaT_gamma-BGO',
			'deltaT_beta-LaBr3'
                    ]
                },
                {
                    "subname": "Pile-up Spectra",
                    "id": "pus",
                    "items": [
                        'PU_GeA_Pile-up',
                        'PU_GeB_Pile-up',
                        'PU_BGO_Pile-up',
                        'PU_SCEPTAR_Pile-up',
                        'PU_ZDS_Pile-up',
                        'PU_PACES_Pile-up',
                        'PU_LaBr3_Pile-up',
                        'PU_LBGO_Pile-up',
                        'PU_TAC_Pile-up'
                    ]
                },
                {
                    "subname": "CFD-check Spectra",
                    "id": "tcs",
                    "items": [
                        'TC_GeA_CFD-check',
                        'TC_GeB_CFD-check',
                        'TC_BGO_CFD-check',
                        'TC_SCEPTAR_CFD-check',
                        'TC_ZDS_CFD-check',
                        'TC_PACES_CFD-check',
                        'TC_LaBr3_CFD-check',
                        'TC_LBGO_CFD-check',
                        'TC_TAC_CFD-check'
                    ]
                }
            ]
        },

        {
            "name": "GRIFFIN",
            "id": "GRIFFIN",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "GRGenergy",
                    "items": griffinCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "GRGtime",
                    "items": griffinCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "GRGpulseHeight",
                    "items": griffinCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "GRGwaveform",
                    "items": griffinCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "BGO",
            "id": "BGO",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "GRSenergy",
                    "items": grifBGOCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "GRStime",
                    "items": grifBGOCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "GRSpulseHeight",
                    "items": grifBGOCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "GRSwaveform",
                    "items": grifBGOCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "SCEPTAR",
            "id": "SCEPTAR",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "SEPenergy",
                    "items": sceptarCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "SEPtime",
                    "items": sceptarCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "SEPpulseHeight",
                    "items": sceptarCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "SEPwaveform",
                    "items": sceptarCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "PACES",
            "id": "PACES",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "PACenergy",
                    "items": pacesCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "PACtime",
                    "items": pacesCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "PACpulseHeight",
                    "items": pacesCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "PACwaveform",
                    "items": pacesCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "LABR3",
            "id": "LABR3",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "LBLenergy",
                    "items": labr3Codes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "TAC",
                    "id": "LBTenergy",
                    "items": tacCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "LBLtime",
                    "items": labr3Codes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "LBLpulseHeight",
                    "items": labr3Codes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Energy Waveform",
                    "id": "LBLwaveform",
                    "items": labr3Codes.map(function(c){return c + '_Waveform'})
                },
                {
                    "subname": "TAC Waveform",
                    "id": "LBTwaveform",
                    "items": tacCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "LABR3 BGO",
            "id": "LABBGO",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "LBSenergy",
                    "items": labBGOCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "LBStime",
                    "items": labBGOCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "LBSpulseHeight",
                    "items": labBGOCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Energy Waveform",
                    "id": "LBSwaveform",
                    "items": labBGOCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "DESCANT",
            "id": "DESCANT",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "DSCenergy",
                    "items": descantCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "DSCtime",
                    "items": descantCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "DSCpulseHeight",
                    "items": descantCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "DSCwaveform",
                    "items": descantCodes.map(function(c){return c + '_Waveform'})
                },
                {
                    "subname": "Zero Crossing",
                    "id": "DSCzero",
                    "items": descantCodes.map(function(c){return c + '_Zero_Crossing'})
                },
                {
                    "subname": "Long Integration",
                    "id": "DSClongInt",
                    "items": descantCodes.map(function(c){return c + '_Long_Integration'})
                },
                {
                    "subname": "Short Integration",
                    "id": "DSCshortInt",
                    "items": descantCodes.map(function(c){return c + '_Short_Integration'})
                }
            ]
        },
	    
        {
            "name": "OGS",
            "id": "OGS",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "OGSenergy",
                    "items": ogsCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "OGStime",
                    "items": ogsCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "OGSpulseHeight",
                    "items": ogsCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "OGSwaveform",
                    "items": ogsCodes.map(function(c){return c + '_Waveform'})
                },
                {
                    "subname": "Zero Crossing",
                    "id": "OGSzero",
                    "items": ogsCodes.map(function(c){return c + '_Zero_Crossing'})
                },
                {
                    "subname": "Long Integration",
                    "id": "OGSlongInt",
                    "items": ogsCodes.map(function(c){return c + '_Long_Integration'})
                },
                {
                    "subname": "Short Integration",
                    "id": "OGSshortInt",
                    "items": ogsCodes.map(function(c){return c + '_Short_Integration'})
                }
            ]
        }
    ]

    dataStore = {
        "pageTitle": 'Spectrum Viewer',                             //header title
        "topGroups": topGroups,                                     //groups in top nav row
        "waveformSnap": true,                                       //do we want the snap to waveform functionality?
        "doUpdates": true,                                          //do we want the data update button and loop?
        "scaling": false,                                           //do we want to expose x-axis rescaling UI?
        "plots": [],                                                //array of names for default plot cells
        "spectrumServer": 'http://grsmid00.triumf.ca:9093',         //analyzer url + port number
        "ODBrequests": [],                                          //array of odb requests to make on refresh
        "zeroedPlots": {}                                           //initialize empty object for zeroed plots
    }
    dataStore.cellIndex = dataStore.plots.length;

}
setupDataStore();


/////////////////
// helpers
/////////////////

function fetchCallback(){
    //fires after all data has been updated

    var i, 
        keys = Object.keys(dataStore.viewers);

    for(i=0; i<keys.length; i++){
        dataStore.viewers[keys[i]].plotData(null, true);
    }
}
