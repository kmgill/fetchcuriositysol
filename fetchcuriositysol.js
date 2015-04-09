var 
	http = require('http'),
	fs = require('fs'),
	cheerio = require('cheerio'),
	sizeOf = require('image-size');

	
http.globalAgent.maxSockets = 20;

function fetchImage(host, uri, onsuccess) {
	var options = {
		hostname : host,
		path : uri,
		method : "GET"
	};

	var httpCallback = function(response) {

		var data = [];
		response.on('data', function(chunk) {
			data.push(chunk);
		});
		response.on('end', function() {
			var buffer = Buffer.concat(data);
			onsuccess(uri, buffer);
		});
		response.on('error', function(err) {
			console.log("Failed to retrieve image at uri " + uri);
			console.log(err);
			//callbackError(err);
		});			
	};
	
	var req = http.get(options, httpCallback);
	req.end();
	
}
	
function fetchURL(host, uri, onsuccess) {
	var options = {
		hostname : host,
		path : uri,
		method : "GET"
	};

	var req = http.get(options, function(res) {
		var data = "";
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			onsuccess(data);
		});
		
	}).on('error', function(e) {
		console.log("headers: ", e);
	});
	req.end();
	
	
}


function fetchImageInfoPage(sol, camera, uri, onImageInfo) {
	fetchURL("mars.nasa.gov", uri, function(data) {
		var $ = cheerio.load(data);
		var links = $('a').map(function(i) {
			if ($(this).attr('href') && $(this).attr('href').match(/msl-raw-images/)) {
				return $(this).attr('href').replace("./", "/msl/multimedia/raw/");
			}
		}).get();
		var imageUrl = links[0];
		
		var alts = $('img').map(function(i) {
			if ($(this).attr('src').match(/msl-raw-images/)) {
				return $(this).attr('alt');
			}
		}).get();
		var alt = alts[0];

		var imageDate = data.match(/\([0-9]{4}\-[ 0-9\-:]+UTC\)/);
		if (imageDate) {
			imageDate = imageDate[0].substring(1, imageDate[0].length - 1);
		}
		
		var desc = data.match(/This image .+[^<\n]+/g);
		if (desc) {
			desc = desc[0];
		}
		
		var imageCredit = "NASA/JPL-Caltech/MSSS";
		
		var imageFile = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
		
		var image = {
			url : imageUrl,
			alt : alt,
			credit : imageCredit,
			date : imageDate,
			description : desc,
			file : imageFile,
			sol : sol,
			camera : camera
		};
		
		if (onImageInfo) {
			onImageInfo(image);
		}
	});
}

function fetchInstrumentOnSol(sol, camera, onImageInfo) {
	var uri = "/msl/multimedia/raw/?s=" + sol + "&camera=" + camera.id;
	
	fetchURL("mars.nasa.gov", uri, function(data) {
		var $ = cheerio.load(data);
	
		var links = $('a').map(function(i) {
			if ($(this).attr('href') && $(this).attr('href').match(/.\/?rawid=/)) {
				return $(this).attr('href').replace("./", "/msl/multimedia/raw/");
			}
		}).get();
		
		if (links.length == 0) {
			console.info("No images for " + camera + " on Sol " + sol);
		} else {
			console.info("Fetching " + links.length + " images for Sol " + sol);
			for (var i = 0; i < links.length; i++) {
				fetchImageInfoPage(sol, camera, links[i], onImageInfo);
			}
		}
	});
}

function fetchAllInstrumentsOnSol(sol, onImageInfo) {
	for (var i = 0; i < cameras.length; i++) {
		fetchInstrumentOnSol(sol, cameras[i], onImageInfo);
	}
}


var cameras = [
	{ name : "Front Hazard Avoidance Cameras (Front Hazcams)", id : "FHAZ_" },
	{ name : "Rear Hazard Avoidance Cameras (Rear Hazcams)", id : "RHAZ_" },
	{ name : "Left Navigation Camera (Navcams)", id : "NAV_LEFT_" },
	{ name : "Right Navigation Camera (Navcams)", id : "NAV_RIGHT_" },

	{ name : "Chemistry & Camera (ChemCam)", id : "CHEMCAM_" },
	{ name : "Mars Descent Imager (MARDI)", id : "MARDI" },
	{ name : "Mars Hand Lens Imager (MAHLI)", id : "MAHLI" },
	{ name : "Mast Camera (Mastcam)", id : "MAST_" }
];

function getCameraById(id) {
	for (var i = 0; i < cameras.length; i++) {
		if (cameras[i].id == id) {
			return cameras[i];
		}
	}
	return null;
}

function createIfNotExists(path) {
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}
}

var handleImageData = function(image) {
		
	var host = image.url.match(/http:\/\/[\w.]+[^\/]/)[0].replace(/http:\/\//, "");
	var uri = image.url.replace(/http:\/\/[\w.]+[^\/]/, "");
	fetchImage(host, uri, function(uri, data) {
		var size = sizeOf(data);
		image.width = size.width;
		image.height = size.height;
		image.type = size.type;
		
		var localFile = "images";
		createIfNotExists(localFile);
		
		localFile += "/msl";
		createIfNotExists(localFile);
		
		localFile += "/" + image.sol;
		createIfNotExists(localFile);
		
		localFile += "/" + image.camera.id;
		createIfNotExists(localFile);
		
		localFile += "/" + image.file;
		
		fs.writeFile(localFile, data, function(err) {
			if(err) {
				return console.log(err);
			}
			
			image.localFile = localFile;
			console.info(image);
		}); 
		
	});
};



if (process.argv.length <= 2 || !process.argv[2].match(/^[0-9]+$/)) {
	console.log("Missing or invalid sol specified");
} else {
	
	if (process.argv.length >= 4) {
		var camera = getCameraById(process.argv[3]);
		if (!camera) {
			console.log("Invalid instrument id specified");
		} else {
			console.log("Fetching " + camera.id + " on Sol " + process.argv[2]);
			fetchInstrumentOnSol(process.argv[2], camera, handleImageData);
		}
	} else {
		console.info("Fetching all images on all instruments on sol " + process.argv[2]);
		fetchAllInstrumentsOnSol(process.argv[2], handleImageData);
	}
}

//