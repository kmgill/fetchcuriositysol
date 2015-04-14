var 
	fs = require('fs'),
	spawn = require('child_process').spawn,
	shared = require('./shared');


/*
var matrix = 4;
var tiles = [
	[2, 3],
	[2, 4],
	[2, 5],
	[2, 6],
	[3, 3],
	[3, 4],
	[3, 5],
	[3, 6]
];
*/
var matrix = 5;
var tiles = [];
for (var r = 0; r <= 19; r++) {
	for (var c = 0; c <= 39; c++) {
		tiles.push([r, c]);
	}
}
/*
var tiles = [
	[0, 0],
	[0, 1],
	[0, 2],
	[0, 3],
	[0, 4],
	[1, 0],
	[1, 1],
	[1, 2],
	[1, 3],
	[1, 4],
	[2, 0],
	[2, 1],
	[2, 2],
	[2, 3],
	[2, 4]
];
*/

function prefixNumber(num) {
	if (num <= 9) {
		return "0" + num;
	} else {
		return num;
	}
}



// montage -tile 2x1 -border 0 -geometry 512 2015-03-06-10-23.jpg 2015-03-06-10-24.jpg joined.jpg
function assembleTiles(year, month, day, writeTo, satellite, onComplete) {
	
	var options = ['-tile', '40x20', '-border', '0', '-geometry', '512'];

	for (var i = 0; i < tiles.length; i++) {
		var fileName = createLocalFileName(year, month, day, tiles[i][0], tiles[i][1], satellite);
		options.push(fileName);
	}
	options.push(writeTo);
	
	var proc = spawn('montage', options);
	
	proc.stdout.setEncoding('utf8');
	proc.stdout.on('data', function (data) {
		var str = data.toString()
		var lines = str.split(/(\r?\n)/g);
		console.log(lines.join(""));
	});

	proc.on('close', function (code) {
		console.log('process exit code ' + code);
		onComplete();
	});
}

function createLocalFileName(year, month, day, row, col, satellite) {
	var localFile = "images/gibs/" + year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + "-" + 
				row + "-" +
				col + "-" + 
				satellite + ".jpg";
	return localFile;
}

function fetchTile(year, month, day, matrix, row, col, satellite, oncomplete) {
	
	var host = "map1.vis.earthdata.nasa.gov";
	var uri = "/wmts-geo/MODIS_" + satellite + "_CorrectedReflectance_TrueColor/default/" + 
				year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + "/EPSG4326_250m/" + matrix + "/" + row + "/" + col + ".jpg";
	
	console.info(uri);
	
	var localFile = createLocalFileName(year, month, day, row, col, satellite);
	
	shared.getImage(host, uri, function(uri, data) {
		
		fs.writeFile(localFile, data, function(err) {
			if(err) {
				return console.log(err);
			}
			console.info(localFile);
			setOneComplete(year, month, day, satellite);
			oncomplete(year, month, day, satellite);
		}); 
	});
}


var completionMap = {};

function setOneComplete(year, month, day, satellite) {
	var key = year + "-" + month + "-" + day + "-" + satellite;
	if (!completionMap[key]) {
		completionMap[key] = 0;
	}
	completionMap[key]++;
}

function isComplete(year, month, day, satellite) {
	var key = year + "-" + month + "-" + day + "-" + satellite;
	if (completionMap[key] && completionMap[key] == tiles.length) {
		return true;
	} else {
		return false;
	}
}

var onDateCompletion = function(year, month, day, satellite) {
	if (!isComplete(year, month, day, satellite)) {
		return;
	}
	var key = year + "-" + month + "-" + day;
	console.info("Is complete: " + key);
	

	var writeTo = "images/gibs/" + year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + "-" + 
				satellite + ".jpg";
				
	assembleTiles(year, month, day, writeTo, satellite, function() {
		for (var i = 0; i < tiles.length; i++) {
			var fileName = createLocalFileName(year, month, day, tiles[i][0], tiles[i][1], satellite);
			fs.unlink(fileName);
		}
	});
}



// New England: Matrix 5, 10/23 10/24
// US: Matrix 4, 2/3
function fetchSet(year, month, day, satellite) {
	var writeTo = "images/" + year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + ".jpg";
	//if (fs.exists(writeTo)) {
	//	return;
	//}
	
	for (var i = 0; i < tiles.length; i++) {
		var tile = tiles[i];
		fetchTile(year, month, day, matrix, tile[0], tile[1], satellite, onDateCompletion);
	}
	
}
//fetchSet(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);

function fetchSetOnTimestamp(ts, satellite) {
	var dt = new Date(ts);
	fetchSet(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), satellite);
	//while(!isComplete(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()));
}
var start = 1420113600 * 1000;
//var start = 1332849600 * 1000;
//var end = 1426852800 * 1000;
var end = 1427544000 * 1000;
fetchSetOnTimestamp(1427544000 * 1000, "Aqua");
for (var ts = start; ts <= end; ts += (86400 * 1000)) {
	//fetchSetOnTimestamp(ts, "Aqua");
	//fetchSetOnTimestamp(ts, "Terra");
	//break;
}


//fetchSetOnTimestamp(1426852800 * 1000);

//assembleTiles("images/2015-03-06-10-23.jpg", "images/2015-03-06-10-24.jpg", "images/2015-03-06.jpg");