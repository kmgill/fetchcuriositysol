
var 
	fs = require('fs'),
	cheerio = require('cheerio'),
	sizeOf = require('image-size'),
	shared = require('./shared');

function fetchImage(host, uri, props) {
	
	shared.getImage(host, uri, function(uri, data) {
		
		var size = sizeOf(data);
		
		var saveTo = props.fileId + "_" + 
					props.pointedTowards + "_" +  
					props.filter1 + "-" + props.filter2 + "_" + 
					props.year + "-" + props.month + "-" + props.day + "_" + 
					
					size.width + "x" + size.height + 
					".jpg";
		
		props.fileName = saveTo;
		
		if (!fs.existsSync("images/cassini/" + saveTo)) {
			fs.writeFile("images/cassini/" + saveTo, data, function(err) {
				if(err) {
					return console.log(err);
				}
				console.log("New Image: " + saveTo);
			}); 
		} else {
			console.log("File Exists: " + saveTo);
		}
	});
}
	
function fetchThumbnailPage(host, uri) {

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
		//console.info(pointedTowards);
		
		var filters = data.match(/ [\w]{3} and [\w]{3} filters\./g);
		if (filters && filters.length > 0) {
			props.filter1 = filters[0].substring(1, 4);
			props.filter2 = filters[0].substring(9, 12);
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
		props.fileId = fileName.substring(0, fileName.indexOf('.'));

		fetchImage(host, imageUri, props);
		
		
	});
	
}
	
function fetchPage(page) {
	
	var host = "saturn.jpl.nasa.gov";
	
	shared.getURL(host, "/photos/raw/?start="+page, function(data) {
		
		var $ = cheerio.load(data);
		http://saturn.jpl.nasa.gov/photos/raw/index.cfm?start=13&storedQ=2704981
		var links = $('a').map(function(i) {
			//http://saturn.jpl.nasa.gov/photos/raw/rawimagedetails/index.cfm?imageID=328271
			if ($(this).attr('href') && $(this).attr('href').match(/index\.cfm\?imageID=/)) {
				return "/photos/raw/" + $(this).attr('href');
			}
		}).get();
		
		for (var i = 0; i < links.length; i++) {
			fetchThumbnailPage(host, links[i]);
		}

	});
	
}


// Full:  http://saturn.jpl.nasa.gov/multimedia/images/raw/casJPGFullS88/N00236254.jpg
// Thumb: http://saturn.jpl.nasa.gov/multimedia/images/raw/casJPGThumbS88/N00236253.jpg

for (var i = 1; i <= 17; i++) {
	fetchPage(i);
}
