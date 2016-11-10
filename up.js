var http = require('http');

var options = {
	host: '127.0.0.1',
	port: 65000,
	path: '/'
};

var _upclient = {
	service: '',
	language: ''
};

function _zenUrlOpt(url) {
	var opt = options;
	opt.path = url;
	return opt;
}

module.exports.init = function(service, language, onSuccess, onError) {
	var url = '/register?service=' + service + '&language=' + language;
	var opt = _zenUrlOpt(url);
	http.get(opt, function(resp) {
		resp.on('data', function(body) {
			var result = JSON.parse(body);
			if (result.error < 0) {
				onError('failed on: ' + url);
			} else {
				console.warn('success register');
				_upclient.service 	= service;
				_upclient.language 	= language;
				onSuccess(_upclient);
			}
		});
	}).on('error', function(e){
		onError('Got error: ' + e.message);
	});
}

function pop(prof) {
	var url = '/pop?service=' + prof.service + '&api=' + prof.api + '&id=' + prof.id;
	var optPop = _zenUrlOpt(url);
	http.get(options, function(resp) {
		resp.on('data', function(body) {
			var result = JSON.parse(body);
			if (result.error < 0) {
				console.warn('pop failed: id=' + prof.id);
			} else {
				console.info('pop: id=' + prof.id);
			}
		});
	}).on('error', function(e){
		console.log('Got error: ' + e.message);
	});
}

module.exports.pop = pop;

module.exports.scopePush = function (api, callback) {
	// push?service=test&api=function
	var url = '/push?service=' + _upclient.service + '&api=' + api;
	console.log(url);
	var optPush = _zenUrlOpt(url);
	http.get(optPush, function(resp) {
		resp.on('data', function(body) {
			var result = JSON.parse(body);
			if (result.error < 0) {
				console.warn('failed on: ' + url);
			} else {
				var e = result;
				console.info('push: id=' + e.id);
				callback(e);
				pop(e);
			}
		});
	}).on('error', function(e){
		console.log('Got error: ' + e.message);
	});
}

module.exports.push = function(api, callback) {
	// push?service=test&api=function
	var url = '/push?service=' + _upclient.service + '&api=' + api;
	var optPush = _zenUrlOpt(url);
	http.get(optPush, function(resp) {
		resp.on('data', function(body) {
			var result = JSON.parse(body);
			if (result.error < 0) {
				console.warn('failed on: ' + url);
			} else {
				var e = result;
				console.info('push: id=' + e.id);
				callback(e);
			}
		});
	}).on('error', function(e){
		console.log('Got error: ' + e.message);
	});
}

// init('test', 'nodejs', function(e) {
// 		// success
// 		console.log('init success');
// 		scopePush('test_scopePush', function(e) {
// 			console.log('scopePush');
// 		});
// 		push('test_push', function(e) {
// 			console.log('async push');
// 			pop(e);
// 		});
// 	}, function (e) {
// 		console.log('init error');
// 	}
// );
