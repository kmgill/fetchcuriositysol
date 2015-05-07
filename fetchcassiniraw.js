
var 
	fs = require('fs'),
	cheerio = require('cheerio'),
	sizeOf = require('image-size'),
	shared = require('./shared');

function fetchImage(host, uri, props, oncomplete) {
	shared.getImage(host, uri, function(uri, data) {
		oncomplete(data, props);
	});
}
	
function fetchThumbnailPage(host, uri, oncomplete) {

	shared.getURL(host, uri, function(data) {
		
		var $ = cheerio.load(data);
		
		var props = {};
		
		var takenOn = data.match(/ was taken on .+[^<\n]+/g)[0].substring(14);
		takenOn = takenOn.substring(0, takenOn.indexOf(" and"));
		props.month = takenOn.substring(0, takenOn.indexOf(" "));
		props.day = takenOn.substring(takenOn.indexOf(" ") + 1, takenOn.indexOf(" ") + 3);
		props.year = takenOn.substring(takenOn.lastIndexOf(" ")+1);

		props.pointedTowards = data.match(/ pointing toward .+[^,<\n]+/g)[0].substring(17);
		props.pointedTowards = props.pointedTowards.substring(0, props.pointedTowards.indexOf(","));
		if (props.pointedTowards.indexOf(" at approx")) {
			props.pointedTowards = props.pointedTowards.substring(0, props.pointedTowards.indexOf(" at approx"));
		}
		
		var filters = data.match(/ [\w]{3,6} and [\w]{3,6} filters\./g);
		if (filters && filters.length > 0) {
			var filters = filters[0].trim().split(" ");
			props.filter1 = filters[0];
			props.filter2 = filters[2];
		} else {
			props.filter1 = "UNK";
			props.filter2 = "UNK";
		}
		
		var images = $('img').map(function(i) {
			var src = $(this).attr('src');
			if (src.match(/(casJPGBrowse)/)) {
				return src;
			}
		}).get();
		
		var imageUri = images[0].replace("casJPGBrowse", "casJPGFull").replace("../../../", "/");
		var fileName = imageUri.substring(imageUri.lastIndexOf("/")+1);
		props.fileId = fileName.substring(1, fileName.indexOf('.'));
	
		props.camera = fileName.substring(0, 1);
		
		oncomplete(imageUri, props);
	});
}
	
function fetchPage(page, query) {
	
	var host = "saturn.jpl.nasa.gov";
	
	var uri =  "/photos/raw/?start="+page;
	
	if (query) {
		uri += "&storedQ=" + query;
	}
	
	shared.getURL(host, uri, function(data) {
		
		var $ = cheerio.load(data);

		var links = $('a').map(function(i) {
			if ($(this).attr('href') && $(this).attr('href').match(/index\.cfm\?imageID=/)) {
				return "/photos/raw/" + $(this).attr('href');
			}
		}).get();
		
		for (var i = 0; i < links.length; i++) {
			fetchThumbnailPage(host, links[i], function(imageUri, props) {
				fetchImage(host, imageUri, props, function(data, props) {
					var size = sizeOf(data);
		
					var saveTo = props.fileId + "_" + props.camera + "_" +
								props.pointedTowards + "_" +  
								props.filter1 + "-" + props.filter2 + "_" + 
								props.year + "-" + props.month + "-" + props.day + "_" + 
								
								size.width + "x" + size.height + 
								".jpg";
					
					props.fileName = saveTo;
					
					var dir = (props.camera == "N") ? "NAC" : "WAC";
					
					if (!fs.existsSync("images/cassini/" + dir + "/" + saveTo)) {
						fs.writeFile("images/cassini/" + dir + "/" + saveTo, data, function(err) {
							if(err) {
								return console.log(err);
							}
							console.log("New Image: " + saveTo);
						}); 
					} else {
						console.log("File Exists: " + saveTo);
					}
				});
				
			});
		}

	});
	
}

// Full:  http://saturn.jpl.nasa.gov/multimedia/images/raw/casJPGFullS88/N00236254.jpg
// Thumb: http://saturn.jpl.nasa.gov/multimedia/images/raw/casJPGThumbS88/N00236253.jpg

var query = null;

if (process.argv.length >= 2) {
	query = process.argv[2];
}

for (var i = 1; i <= 17; i++) {
	fetchPage(i, query);
}
