
var 
	fs = require('fs'),
	cheerio = require('cheerio'),
	shared = require('./shared');
	

	
function fetchPage(page) {
	
	var host = "saturn.jpl.nasa.gov";
	
	shared.getURL(host, "/photos/raw/?start="+page, function(data) {
		
		var $ = cheerio.load(data);
		
		var thumbnails = $('img').map(function(i) {
		  return $(this).attr('src');
		}).get();
		
		for (var i = 0; i < thumbnails.length; i++) {
			if (thumbnails[i].match(/(casJPGThumbS88)/)) {
				var uri = thumbnails[i].replace("casJPGThumbS88", "casJPGFullS88").replace("../../", "/");

				shared.getImage(host, uri, function(uri, data) {
					var fileName = uri.substring(uri.lastIndexOf("/")+1);
					if (!fs.existsSync("images/cassini/" + fileName)) {
						fs.writeFile("images/cassini/" + fileName, data, function(err) {
							if(err) {
								return console.log(err);
							}
							console.log("New Image: " + fileName);
						}); 
					} else {
						console.log("File Exists: " + fileName);
					}
				});
			}
		}
	});
	
}


// Full:  http://saturn.jpl.nasa.gov/multimedia/images/raw/casJPGFullS88/N00236254.jpg
// Thumb: http://saturn.jpl.nasa.gov/multimedia/images/raw/casJPGThumbS88/N00236253.jpg
for (var i = 1; i <= 17; i++) {
	fetchPage(i);
}
