/*
	fetchnewhorizonsraw.js - Fetches available raw images from the New Horizons mission to the Pluto system.
	
	The New Horizons raw image page uses an interesting means to building it's thumbnail table, whereby it
	has all the details being added into separate JavaScript arrays and then passed to a table builder. 
	So, rather than rely on those, the jpeg uri is modified to fetch the level 1 image metadata, which is
	then parsed and cherry-picked for data.
	
	You know, and I'm rambling here, I would love to see the creation of a unified raw image distribution 
	standard which could be consumed by the browser-side pages and by automated scripts such as this. 
	Similar in concept to a RSS or Atom feed, but containing relevant science and image data as available
	in an automated platform. Perhaps a simple REST service or static metadata JSON files generated as the 
	images roll in from the spacecraft/DSN/science team? It's not really that hard and shouldn't be
	overengineered (KISS principle, folks!). A sort of Planetary Data System for near-realtime mission
	raw imagery. And if I have my way (and I don't. yet.), I would be using 16 bit PNG encoding for web compatibility
	and to support amateur citizen science (8bit JPEG doesn't cut it for that...), contingent on the capabilities
	of the actual instruments taking the images. I don't know, but I would think that there would be sufficient
	public interest in this sort of system existing to justify the effort involved in developing it. 
*/

var 
	fs = require('fs'),
	cheerio = require('cheerio'),
	sizeOf = require('image-size'),
	shared = require('./shared');

function fetchImage(host, meta, oncomplete) {
	var uri = "/soc/Pluto-Encounter/" + meta.jpegUri;

	shared.getImage(host, uri, function(uri, data) {
		oncomplete(data, meta);
	});
}

function parseLevel1MetaFile(data) {
	var lines = data.split(/\n/);
	
	var keyValuePairs = {};
	
	for (var i = 0; i < lines.length; i++) {
		var keyValuePair = lines[i].split(/=/);
		if (keyValuePair[1] != undefined && keyValuePair[1].match(/[^\']+/) != null) {
			keyValuePairs[keyValuePair[0]] = keyValuePair[1].match(/[^\']+/)[0];
		}
	}

	return keyValuePairs;
}

function fetchLevel1MetaFile(host, meta, oncomplete) {
	shared.getURL(host, "/soc/Pluto-Encounter/" + meta.metaUri, function(data) {
		
		var level1 = parseLevel1MetaFile(data);
		
		meta.compressionType = level1.CompressionType;
		meta.exposure = level1.Exposure;
		meta.dateUTC = level1.UTCTime;
		meta.range = level1.TargetRange;
		meta.missionPhase = level1.MissionPhase;
		meta.missionSubPhase = level1.MissionSubPhase;
		meta.sapName = level1.SapName;
		meta.sapDescription = level1.SapDescription;
		meta.description = level1.Description;
		meta.rideAlong = (level1.RideAlong === 'YES');
		meta.target = level1.Target;
		meta.targetsInFov = level1.TargetsInFOV;
		meta.pointingMethod = level1.PointingMethod;
		meta.spacecraftSpin = level1.SpacecraftSpin;

		oncomplete(meta);
	});
}


function removeValuesFromArrayPushes(from) {
	var dest = [];
	if (from) {
		for (var i = 0; i < from.length; i++) {
			var u = from[i].match(/\".+\"/)[0];
			dest.push(u.substring(1, u.length - 1));
		}
	}
	return dest;
}

function extractTargets(data) {
	var m = data.match(/TargetArr\.push\(\"[^\"\)]+"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

function extractJpegURLs(data) {
	var m = data.match(/jpegArr\.push\(\"[\w_\/]+\.jpg\"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

function extractUtcDates(data) {
	var m = data.match(/UTCArr\.push\(\"[^\"\)]+"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

function extractDescriptions(data) {
	var m = data.match(/DescArr\.push\(\"[^\"\)]+"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

function extractExposures(data) {
	var m = data.match(/ExpArr\.push\(\"[^\"\)]+"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

function extractRanges(data) {
	var m = data.match(/RangeArr\.push\(\"[^\"\)]+"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

function extractNames(data) {
	var m = data.match(/NameArr\.push\(\"[^\"\)]+"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

function extractMetaValues(data) {
	var m = data.match(/METArr\.push\(\"[^\"\)]+"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

function extractStatuses(data) {
	var m = data.match(/StatusArr\.push\(\"[^\"\)]+"\)/g);
	var values = removeValuesFromArrayPushes(m);
	return values;
}

// data/pluto/level2/lor/jpeg/029172/lor_0291721528_0x630_sci_3.jpg
// to
// /data/pluto/level1/lor/info/029172/lor_0291721528_0x630_eng_3.txt
function jpegUriToMetaUri(jpegUri) {
	metaUri = jpegUri.replace("level2", "level1").replace("jpeg", "info").replace("_sci_", "_eng_").replace(".jpg", ".txt");
	return metaUri;
}

// data/pluto/level2/lor/jpeg/029172/lor_0291721528_0x630_sci_3.jpg
// to
// data/pluto/level1/lor/jpeg/029172/lor_0291721528_0x630_eng_3.jpg
function jpegUriToLevel1JpegUri(jpegUri) {
	metaUri = jpegUri.replace("level2", "level1").replace("_sci_", "_eng_");
	return metaUri;
}

function saveData(data, path) {
	fs.writeFile("images/newhorizons/" + path, data, function(err) {
		if(err) {
			return console.log(err);
		}
	}); 
}

function fetchPage(page) {
	
	var host = "pluto.jhuapl.edu";
	shared.getURL(host, "/soc/Pluto-Encounter/index.php?page="+page, function(data) {
		
		var jpegs = extractJpegURLs(data);
		for (var i = 0; i < jpegs.length; i++) {
			var meta = {
				jpegUri : jpegs[i],
				jpegUriLevel1 : jpegUriToLevel1JpegUri(jpegs[i]),
				file : jpegs[i].substring(jpegs[i].lastIndexOf("/") + 1),
				metaUri : jpegUriToMetaUri(jpegs[i])
			};
			fetchLevel1MetaFile(host, meta, function(metaWithLevel1) {
				fetchImage(host, metaWithLevel1, function(data, metaWithLevel1) {
					
					var size = sizeOf(data);
					var saveTo = metaWithLevel1.file;
					
					metaWithLevel1.image = {
						width : size.width,
						height : size.height
					};

					if (!fs.existsSync("images/newhorizons/" + saveTo)) {
						console.info("New File: " + metaWithLevel1.file + " (" + metaWithLevel1.dateUTC + ")");
						saveData(data, saveTo);
						saveData(JSON.stringify(metaWithLevel1, null, 4), saveTo.replace(".jpg", ".json"));
					} else {
						console.info("File Exists: " + metaWithLevel1.file + " (" + metaWithLevel1.dateUTC + ")");
					}
				});
			});
		}
	});
}


if (process.argv.length > 3 && process.argv[2] == "-pg" && process.argv[3].match(/^[0-9]+$/)) {
	
	// Fetch single page
	var pageToFetch = process.argv[3];
	console.info("Fetching page #" + pageToFetch);
	fetchPage(pageToFetch);
	
} else {
	// By default, go 14 pages deep
	var numPages = 14;
	
	if (process.argv.length > 3 && process.argv[2] == "-to" && process.argv[3].match(/^[0-9]+$/)) {
		numPages = process.argv[3];
	}
	for (var i = 1; i <= numPages; i++) {
		console.info("Fetching page #" + i);
		fetchPage(i);
	}
}


