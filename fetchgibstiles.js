/** There is a newer version of this file. It will be added when I get to my other PC... */

var 
	fs = require('fs'),
	spawn = require('child_process').spawn,
	shared = require('./shared');

	
http.globalAgent.maxSockets = 1;

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



function prefixNumber(num) {
	if (num <= 9) {
		return "0" + num;
	} else {
		return num;
	}
}


// montage -tile 2x1 -border 0 -geometry 512 2015-03-06-10-23.jpg 2015-03-06-10-24.jpg joined.jpg
function assembleTiles(year, month, day, writeTo, onComplete) {
	
	var options = ['-tile', '4x2', '-border', '0', '-geometry', '480'];
	
	
	
	for (var i = 0; i < tiles.length; i++) {
		var fileName = createLocalFileName(year, month, day, tiles[i][0], tiles[i][1]);
		options.push(fileName);
	}
	options.push(writeTo);
	
	var proc = spawn('montage', options);//, left, right, writeTo]);
	
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

function createLocalFileName(year, month, day, row, col) {
	var localFile = "images/gibs/" + year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + "-" + 
				row + "-" +
				col + ".jpg";
	return localFile;
}

function fetchTile(year, month, day, matrix, row, col, oncomplete) {
	
	var host = "map1.vis.earthdata.nasa.gov";
	var uri = "/wmts-geo/MODIS_Terra_CorrectedReflectance_TrueColor/default/" + 
				year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + "/EPSG4326_250m/" + matrix + "/" + row + "/" + col + ".jpg";
	
	console.info(uri);
	
	var localFile = createLocalFileName(year, month, day, row, col);

	shared.getImage(host, uri, function(uri, data) {
		
		fs.writeFile(localFile, data, function(err) {
			if(err) {
				return console.log(err);
			}
			console.info(localFile);
			setOneComplete(year, month, day);
			oncomplete(year, month, day);
		}); 
	});
}


var completionMap = {};

function setOneComplete(year, month, day) {
	var key = year + "-" + month + "-" + day;
	if (!completionMap[key]) {
		completionMap[key] = 0;
	}
	completionMap[key]++;
}

function isComplete(year, month, day) {
	var key = year + "-" + month + "-" + day;
	if (completionMap[key] && completionMap[key] == tiles.length) {
		return true;
	} else {
		return false;
	}
}

var onDateCompletion = function(year, month, day) {
	if (!isComplete(year, month, day)) {
		return;
	}
	var key = year + "-" + month + "-" + day;
	console.info("Is complete: " + key);
	

	var writeTo = "images/gibs/" + year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + ".jpg";
				
	assembleTiles(year, month, day, writeTo, function() {
		for (var i = 0; i < tiles.length; i++) {
			var fileName = createLocalFileName(year, month, day, tiles[i][0], tiles[i][1]);
			fs.unlink(fileName);
		}
	});
}



// New England: Matrix 5, 10/23 10/24
// US: Matrix 4, 2/3
function fetchSet(year, month, day) {
	var writeTo = "images/gibs/" + year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + ".jpg";
	if (fs.exists(writeTo)) {
		return;
	}
	
	for (var i = 0; i < tiles.length; i++) {
		var tile = tiles[i];
		fetchTile(year, month, day, matrix, tile[0], tile[1], onDateCompletion);
	}
	
}

function fetchSetOnTimestamp(ts) {
	var dt = new Date(ts);
	fetchSet(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

var start = 1363780800 * 1000;
var end = 1426852800 * 1000;

for (var ts = start; ts <= end; ts += (86400 * 1000)) {
	//fetchSetOnTimestamp(ts);
}

fetchSetOnTimestamp(1426852800 * 1000);

//assembleTiles("images/2015-03-06-10-23.jpg", "images/2015-03-06-10-24.jpg", "images/2015-03-06.jpg");