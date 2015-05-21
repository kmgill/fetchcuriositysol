var 
	fs = require('fs'),
	spawn = require('child_process').spawn,
	shared = require('./shared');


	//http://www.nnvl.noaa.gov/Portal/Images/TRUE/TRUE.daily.20150519.color/2/3/0.png
var servers = {
	"gibs" : 
		{ 
			"name" : "gibs",
			"host" : "map1.vis.earthdata.nasa.gov",
			"uri" : "/wmts-geo/MODIS_{satellite}_CorrectedReflectance_TrueColor/default/{year}-{month}-{day}/EPSG4326_250m/{level}/{row}/{col}.jpg",
			"satellites" : [{"name":"Terra", "adds":[]}, {"name":"Aqua", "adds":[]}],
			"levels" : []
		},
	"nnvl" : 
		{
			"name" : "nnvl",
			"host" : "www.nnvl.noaa.gov",
			"uri" : "/Portal/Images/{satellite}/{satellite}.daily.{year}{month}{day}{add-0}/{level}/{col}/{row}.png",
			"satellites" : [{"name":"TRUE", "adds":[".color"]}, {"name":"GOES", "adds":[]}],
			"levels" : []
		}
};

	
function createLevel(matrix, rows, cols, uri) {
	var level = {
		matrix : matrix,
		rows : rows,
		columns : cols,
		uri : uri,
		tiles : []
	};
	for (var r = 0; r < rows; r++) {
		for (var c = 0; c < cols; c++) {
			level.tiles.push([r, c]);
		}
	}
	return level;
}

servers.gibs.levels.push(createLevel(1, 1, 3, "EPSG4326_250m"));
servers.gibs.levels.push(createLevel(2, 3, 5, "EPSG4326_250m"));
servers.gibs.levels.push(createLevel(3, 5, 10, "EPSG4326_250m"));
servers.gibs.levels.push(createLevel(4, 10, 20, "EPSG4326_250m"));
servers.gibs.levels.push(createLevel(5, 20, 40, "EPSG4326_250m"));
servers.gibs.levels.push(createLevel(6, 40, 80, "EPSG4326_250m"));

servers.nnvl.levels.push(createLevel(0, 1, 1, "0"));
servers.nnvl.levels.push(createLevel(1, 1, 2, "0"));
servers.nnvl.levels.push(createLevel(2, 2, 4, "0"));
servers.nnvl.levels.push(createLevel(3, 4, 8, "0"));
servers.nnvl.levels.push(createLevel(4, 8, 16, "0"));
servers.nnvl.levels.push(createLevel(5, 16, 32, "0"));
servers.nnvl.levels.push(createLevel(6, 32, 64, "0"));

function prefixNumber(num) {
	if (num <= 9) {
		return "0" + num;
	} else {
		return num;
	}
}



// montage -tile 2x1 -border 0 -geometry 512 2015-03-06-10-23.jpg 2015-03-06-10-24.jpg joined.jpg
function assembleTiles(year, month, day, level, writeTo, satellite, onComplete) {
	
	var dimensions = level.columns + "x" + level.rows;
	var options = ['-tile', dimensions, '-border', '0', '-geometry', '512'];

	for (var i = 0; i < level.tiles.length; i++) {
		var fileName = createLocalFileName(year, month, day, level.tiles[i][0], level.tiles[i][1], satellite);
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


function getSatelliteInfoFromServer(host, satellite) {
	for (var i = 0; i < host.satellites.length; i++) {
		if (host.satellites[i].name == satellite) {
			return host.satellites[i];
		}
	}
	return {"name":"default", "adds": []};
}

function fetchTile(year, month, day, level, row, col, host, satellite, oncomplete) {
	
	var satelliteInfo = getSatelliteInfoFromServer(host, satellite);
	var uri = host.uri.replace(/{satellite}/g, satellite)
						.replace(/{year}/g, year)
						.replace(/{month}/g, prefixNumber(month))
						.replace(/{day}/g, prefixNumber(day))
						.replace(/{level}/g, level.matrix)
						.replace(/{row}/g, row)
						.replace(/{col}/g, col);
								
	for (var i = 0; i < 10; i++) {
		var replace = "{add-" + i + "}";
		var replaceWith = (satelliteInfo.adds.length > i) ? satelliteInfo.adds[i] : "";
		uri = uri.replace(replace, replaceWith);
	}

	var localFile = createLocalFileName(year, month, day, row, col, satellite);
	
	shared.getImage(host.host, uri, function(uri, data) {
		
		fs.writeFile(localFile, data, function(err) {
			if(err) {
				return console.log(err);
			}
			//console.info(localFile);
			setOneComplete(year, month, day, satellite);
			oncomplete(year, month, day, satellite, level);
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

function isComplete(year, month, day, satellite, level) {
	var key = year + "-" + month + "-" + day + "-" + satellite;
	if (completionMap[key] && completionMap[key] == level.tiles.length) {
		return true;
	} else {
		return false;
	}
}

var onDateCompletion = function(year, month, day, satellite, level) {
	if (!isComplete(year, month, day, satellite, level)) {
		return;
	}
	var key = year + "-" + month + "-" + day;
	console.info("Is complete: " + key);
	

	var writeTo = "images/gibs/" + year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + "-" + 
				satellite + ".jpg";
				
	assembleTiles(year, month, day, level, writeTo, satellite, function() {
		for (var i = 0; i < level.tiles.length; i++) {
			var fileName = createLocalFileName(year, month, day, level.tiles[i][0], level.tiles[i][1], satellite);
			fs.unlink(fileName);
		}
	});
}


function fetchSet(year, month, day, host, satellite, level) {
	var writeTo = "images/" + year + "-" + 
				prefixNumber(month) + "-" + 
				prefixNumber(day) + ".jpg";
	
	for (var i = 0; i < level.tiles.length; i++) {
		var tile = level.tiles[i];
		fetchTile(year, month, day, level, tile[0], tile[1], host, satellite, onDateCompletion);
	}
	
}

function isNumber(val) {
	if (val.match(/^[0-9]+$/)) {
		return true;
	} else {
		return false;
	}
}

function isBetweenInclusive(val, start, end) {
	return (val >= start && val <= end);
}


function createDefaultRunConfig() {
	var dt = new Date();
	var config = {
		host : "gibs",
		year : dt.getFullYear(),
		month : (dt.getMonth() + 1),
		day : dt.getDate(),
		satellite : "Terra",
		level : 2
	};
	return config;
}


var runConfig = createDefaultRunConfig();

// Some rather basic command line arg processing
for (var i = 0; i < process.argv.length - 1; i++) {
	switch (process.argv[i]) {
	case "-l":	// Level
		runConfig.level = (isNumber(process.argv[i + 1]) ? parseInt(process.argv[i + 1]) : runConfig.level);
		break;
	case "-y":	// Year
		runConfig.year = (isNumber(process.argv[i + 1]) ? parseInt(process.argv[i + 1]) : runConfig.year);
		break;
	case "-m": // Month
		runConfig.month = (isNumber(process.argv[i + 1]) ? parseInt(process.argv[i + 1]) : runConfig.month);
		break;
	case "-d": // Day
		runConfig.day = (isNumber(process.argv[i + 1]) ? parseInt(process.argv[i + 1]) : runConfig.day);
		break;
	case "-s": // Satellite
		runConfig.satellite = process.argv[i + 1];
		break;
	case "-h": // Host
		runConfig.host = process.argv[i + 1];
		break;
	}
}

// TODO: Some actual error checking

fetchSet(runConfig.year, runConfig.month, runConfig.day, servers[runConfig.host], runConfig.satellite, servers[runConfig.host].levels[runConfig.level]);
