var 
	http = require('http'),
	fs = require('fs'),
	spawn = require('child_process').spawn;
	
	
http.globalAgent.maxSockets = 1;


var getImage = function(host, uri, onsuccess, onfailure) {
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
			if (onfailure) {
				onfailure(err);
			}
		});			
	};
	
	var req = http.get(options, httpCallback);
	req.end();	
}

var getURL = function(host, uri, onsuccess, onfailure) {
	var options = {
		hostname : host,
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
		if (onfailure) {
			onfailure(e);
		}
	});
	req.end();

}

var createIfNotExists = function(path) {
        if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
        }
}

	


exports.getImage = getImage;
exports.getURL = getURL;
exports.createIfNotExists = createIfNotExists;
