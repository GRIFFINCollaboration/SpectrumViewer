function arrangePoints(x, y, flags){
    //take two equal length arrays x, y and return an array of points suitable for dygraphs, ie
    // [ [x[0], y[0]], [x[1], y[1]]...  ]
    //flags is another array indicating different data series; 
    //for every distinct flag, there will be another column in the inner arrays; a given column will contain only values sharing a flag, or null.
    // example: arrangePoints( [0,1,2,3], [10,11,12,13], [1,2,1,2]) returns:
    // [
    //      [0,10,null],
    //      [1,null,11],
    //      [2,12,null],
    //      [3,null,13] 
    // ]

    var copyFlags = []
    var uniqueFlags;
    var i, j, series, data = [];
    var row = [];

    for(i=0; i<flags.length; i++){
        copyFlags.push(flags[i]);
    }
    uniqueFlags = Array.from(new Set(flags.sort()));

    for(i=0; i<x.length; i++){
        row = [x[i]];
        series = uniqueFlags.indexOf(copyFlags[i]);
        for(j=0; j<uniqueFlags.length; j++){
            if(j == series)
                row.push(y[i]);
            else
                row.push(null);
        }
        data.push(row);
    }

    return data;
}

function createBins(n, constant){
    //returns an array [0,1,2,...n-1], useful for creating the x-array for arrangePoints if all you have is a spectrum of y values.
    //if constant is defined, returns an array of length n repeating constant.
    //thanks http://stackoverflow.com/questions/3746725/create-a-javascript-array-containing-1-n

    if(arguments.length === 1)
        return Array.apply(null, {length: n}).map(Number.call, Number)
    else
        return Array.apply(null, {length: n}).map(function(){return constant}, null)

}

function toggleHidden(id){

    var classes = document.getElementById(id).className.split(' ');
    var hidden = classes.indexOf('hidden')

    if(hidden == -1){
        classes.push('hidden')
    } else{
        classes.splice(hidden, 1)
    }

    document.getElementById(id).className = classes.join(' ')

}

function alwaysThisLong(number, minLength){
    //returns number as a string padded with most-significant 0's to make it minLength.

    var num = ''+number;
    while(num.length<minLength)
        num = '0' + num

    return num
}

function getSelected(id){
    //return the current value selected by the select element with id.
    //thx http://stackoverflow.com/questions/1085801/get-selected-value-in-dropdown-list-using-javascript

    var e = document.getElementById(id);
    return e.options[e.selectedIndex].value;
}

function fadeHexColor(color, opacity){
    //given a hex color '#123456', return 'rgba(0x12, 0x34, 0x56, opactiy)'

    var R, G, B;

    R = parseInt(color.slice(1,3), 16);
    G = parseInt(color.slice(3,5), 16);
    B = parseInt(color.slice(5,7), 16);

    return 'rgba(' + R + ',' + G + ',' + B + ',' + opacity + ')';
}