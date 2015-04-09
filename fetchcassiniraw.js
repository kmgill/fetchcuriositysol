
var 
	http = require('http'),
	https = require('https'),
	fs = require('fs'),
	path = require('path'),
	exec  = require('child_process').exec,
	sys   = require('sys'),
	os = require('os'),
	urlParser = require('url'),
	utils = require('util'),
	cheerio = require('cheerio');
	
function fetchImage(uri, onsuccess) {
	var options = {
		hostname : "saturn.jpl.nasa.gov",
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
			//callbackError(err);
		});			
	};
	
	var req = http.get(options, httpCallback);
	req.end();
	
}
	
function fetchURL(uri, onsuccess) {
	var options = {
		hostname : "saturn.jpl.nasa.gov",
		path : uri,
		method : "GET",
		agent: false
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
	
function fetchPage(page) {
	
	fetchURL("/photos/raw/?start="+page, function(data) {
	//console.log(data);
	var $ = cheerio.load(data);
	
	var thumbnails = $('img').map(function(i) {
      return $(this).attr('src');
    }).get();
	
	for (var i = 0; i < thumbnails.length; i++) {
		if (thumbnails[i].match(/(casJPGThumbS88)/)) {
			var uri = thumbnails[i].replace("casJPGThumbS88", "casJPGFullS88").replace("../../", "/");
			
			
			fetchImage(uri, function(uri, data) {
				var fileName = uri.substring(uri.lastIndexOf("/")+1);
				if (!fs.existsSync("images/cassini/" + fileName)) {
					fs.writeFile("images/cassini/" + fileName, data, function(err) {
						if(err) {
							return console.log(err);
						}

						console.log("New Image: " + fileName);
					}); 
				}
			});
			//console.log(uri);
		}
	}
});
	
}


// Full:  http://saturn.jpl.nasa.gov/multimedia/images/raw/casJPGFullS88/N00236254.jpg
// Thumb: http://saturn.jpl.nasa.gov/multimedia/images/raw/casJPGThumbS88/N00236253.jpg
for (var i = 1; i <= 17; i++) {
	fetchPage(i);
}
