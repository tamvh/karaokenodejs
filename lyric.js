var _global = {
	// address: process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1',
	// port: process.env.OPENSHIFT_NODEJS_PORT || 8080
	port: 8080
};

var http = require("http");
var zlib = require("zlib");
var express = require('express');
var app = express();
var request = require('request');
var redis = require('redis');
var _cache = redis.createClient();
var liblistsong = require("./liblistsong.js")
var mysql = require("mysql");
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'karaoke'
});

function _zenKeyLyric(id) {
	return 'lyric_' + id;
}

function _zenKeySuggest(name) {
	return 'sug_' + name;
}

function _zenKeySearch(name) {
	return 'search_' + name;
}

function _fetchLyric(req, res, songId) {
	if (songId === undefined) {
		res.send({
			error: -2,
			msg: 'song not found'
		});
		return;
	}

	var id = _zenKeyLyric(songId);
	console.log('id: ' + songId);
	_cache.get(id, function(err, reply) {
		if (reply) {
			// exist
			var jsonSong = JSON.parse(reply);
			res.send({
				error: 0,
				msg: jsonSong.lyric
			});
		} else {
			// not exist
			var preLyric = 'http://mp3.zing.vn/xhr/song/get-lyrics?songid=';
			var urlLyric = preLyric + songId;
			console.log('url: ' + urlLyric);
			request(urlLyric, function (error, response, body) {
				if (!error && response.statusCode == 200 && body) {
					var jsonLyric = JSON.parse(body);
					var data = jsonLyric.data[0];
					if (data === undefined) {
						res.send({
							error: -1,
							msg: 'not found music'
						});
						return;
					}
					console.log('data: ' + data);
					var songData = {
						name: data.name,
						artist: data.artist,
						lyric: data.content
					};
					//console.log(strLyric);
					var id = _zenKeyLyric(songId);
					_cache.set(id, JSON.stringify(songData), function(err, reply) {
						console.log(' - write_cache: id=' + id + ', song=' + songData.name);
					});

					res.send({
						error: 0,
						msg: data.content//songData
					});
				} else {
					res.send({
						error: -3,
						msg: 'get song failed'
					});
				}
			});
		}
	});

}

function _fetchSong(req, res, strSong) {
	var preUrl = 'http://ac.mp3.zing.vn/complete?type=artist,album,video,song&num=4&callback=jQuery210007569393399171531_1452762760980&query=';
	var url = preUrl + strSong;
	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var json = JSON.parse(body);
			var song = undefined;
			if (json.result && json.data.length > 0) {
				for (ix in json.data) {
					data = json.data[ix];
					if (data.song !== undefined) {
						var songData = data.song[0];
						if (songData !== undefined) {
							//console.log(songData);
							song = {
								artist: songData.artist,
								name: songData.name,
								id: songData.id};
							// console.log(' -> id: ' + song.id);

							// // write cache
							// var keySong = _zenKeySuggest(strSong);
							// _cache.set(keySong, JSON.stringify(song), function(err, reply) {
							// 	console.log(' write suggest: ' + keySong);
							// });
							_fetchLyric(req, res, song.id);
							return;
						}
					}
				}

				res.send({
					error: -3,
					msg: 'song not found'
				});
			}
		} else {
			res.send({
				error: -1,
				msg: 'request failed'
			});
			console.log('request failed: ' + song.id);
		}
	});
}

function getGzipped(url, onSuccess, onError) {
	var buffer = [];
	http.get(url, function(res) {
		var gunzip = zlib.createGunzip();			
		res.pipe(gunzip);
		gunzip.on('data', function(data) {
			buffer.push(data.toString())
		}).on("end", function() {
			onSuccess(null, buffer.join("")); 

		}).on("error", function(e) {
			onError(e);
		})
	}).on('error', function(e) {
		onError(e)
	});
}

function _fetchKaraoke(req, res, songId) {
	if (songId === undefined) {
		res.send({
			error: -2,
			msg: 'song not found'
		});
		return;
	}

	console.log('id: ' + songId);

	// not cache streaming link
	var urlHtml = 'http://mp3.zing.vn/bai-hat/I-m-Sorry-Babe-Bao-Thy/' + songId + '.html';
	console.log('urlHtml: ' + urlHtml);

	// 1: parse on htp gzip
	getGzipped(urlHtml, function(err, data) {
		// console.log(data);
		var XML_MATCH = 'data-xml="';
		var pReqFirst = data.indexOf(XML_MATCH);
		if (pReqFirst <= 0) {
			res.send({
				error: 0,
				msg: 'hello' //data.content//songData
			});
		} else {
			// parse 1 url
			pReqFirst += XML_MATCH.length;
			var pReqLast = data.indexOf('"', pReqFirst);
			var urlReq = data.substring(pReqFirst, pReqLast);
			console.log(urlReq);

			// 2: parse on json
			request(urlReq, function (error, response, body) {
				if (!error && response.statusCode == 200 && body) {
					var streamJson = JSON.parse(body);
					if (streamJson === undefined) {
						res.send({
							error: -1,
							msg: 'not found music'
						});
						return;
					}
					console.log('streamJson: ' + body);
					var urlMp3 = '';

					try {
						var urlLyric = streamJson.data[0].lyric;
						console.log('urlLyric: ' + urlLyric)
						if (urlLyric == '' || urlLyric == null) {
							res.send({
								error: -1,
								msg: urlMp3
							});
						} else {
							request(urlLyric, function (error, response, body) {
								if (!error && response.statusCode == 200 && body) {
									console.log('lyricKaraoke: ' + body);
									res.send({
										error: 0,
										msg: body
									});
								} else {
									res.send({
										error: -3,
										msg: 'get song failed'
									});
								}
							});
						}
					} catch (err) {
						res.send({
							error: -5,
							msg: 'that bad'
						});
					}
				} else {
					res.send({
						error: -3,
						msg: 'get song failed'
					});
				}
			});
		}
	}, function(err) {
		res.send({
			error: -3,
			msg: 'get song failed'
		});
	});
}

function _fetchMp3Url(req, res, songId) {
	if (songId === undefined) {
		res.send({
			error: -2,
			msg: 'song not found'
		});
		return;
	}

	console.log('id: ' + songId);

	// not cache streaming link
	var urlHtml = 'http://mp3.zing.vn/bai-hat/I-m-Sorry-Babe-Bao-Thy/' + songId + '.html';
	console.log('urlHtml: ' + urlHtml);

	// 1: parse on http gzip
	getGzipped(urlHtml, function(err, data) {
		// console.log(data);
		var XML_MATCH = 'data-xml="';
		var pReqFirst = data.indexOf(XML_MATCH);
		if (pReqFirst <= 0) {
			res.send({
				error: 0,
				msg: 'hello' //data.content//songData
			});
		} else {
			// parse 1 url
			pReqFirst += XML_MATCH.length;
			var pReqLast = data.indexOf('"', pReqFirst);
			var urlReq = data.substring(pReqFirst, pReqLast);
			console.log(urlReq);

			// 2: parse on json
			request(urlReq, function (error, response, body) {
				if (!error && response.statusCode == 200 && body) {
					var streamJson = JSON.parse(body);
					if (streamJson === undefined) {
						res.send({
							error: -1,
							msg: 'not found music'
						});
						return;
					}
					console.log('streamJson: ' + body);
					var urlMp3 = '';

					try {
						var list = streamJson.data[0].source_list;
						for (var idx in list) {
							var url = list[idx];
							if (url) {
								urlMp3 = url;
								break;
							}
						}
						res.send({
							error: 0,
							msg: urlMp3
						});
					} catch (err) {
						res.send({
							error: -5,
							msg: 'that bad'
						});
					}
				} else {
					res.send({
						error: -3,
						msg: 'get song failed'
					});
				}
			});
		}
	}, function(err) {
		res.send({
			error: -3,
			msg: 'get song failed'
		});
	});
}

function _fetchSearch(req, res, strSong) {
	var preUrl = 'http://ac.mp3.zing.vn/complete?type=artist,album,video,song&num=4&callback=jQuery210007569393399171531_1452762760980&query=';
	var url = preUrl + strSong;
	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var json = JSON.parse(body);
			var song = undefined;
			if (json.result && json.data.length > 0) {
				var keySong = _zenKeySearch(strSong);
				_cache.set(keySong, JSON.stringify(json.data), function(err, reply) {
					console.log(' - write_cache: ' + keySong);
				});
				res.send({
					error: 0,
					msg: json.data
				});
			}
		} else {
			res.send({
				error: -1,
				msg: 'request failed'
			});
			console.log('request failed: ' + song.id);
		}
	});
}

app.get('/lyric', function (req, res) {
	var strSong = req.query.song;
	console.log('/lyric/' + strSong);
	var keySong = _zenKeySuggest(strSong);
	_cache.get(keySong, function(err, reply) {
		if (reply) {
			// exist
		 	// console.warn(' hit cache: ' + reply);
			//_fetchLyric(req, res, JSON.parse(reply));
			res.send({
				error: 0,
				msg: JSON.parse(reply)
			});
		} else {
			// not exist
			//console.warn(' miss cache');
			_fetchSong(req, res, strSong);
		}
	});
});

app.get('/search', function (req, res) {
	var strSong = req.query.song;
	console.log('/search/' + strSong);
	var keySong = _zenKeySearch(strSong);
	_cache.get(keySong, function(err, reply) {
		if (reply) {
			// exist
		 	// console.warn(' hit cache: ' + reply);
			res.send({
				error: 0,
				msg: JSON.parse(reply)
			});
		} else {
			// not exist
			//console.warn(' miss cache');
			_fetchSearch(req, res, strSong);
		}
	});
	//res.send('get song: ' + strSong);
});

app.get('/lyric_by_id', function (req, res) {
	var id = req.query.id;
	console.log('/lyric_by_id/' + id);
	_fetchLyric(req, res, id);
	//res.send('get song: ' + strSong);
});

app.get('/mp3_by_id', function (req, res) {
	var id = req.query.id;
	console.log('/mp3_by_id/' + id);

	try {
		_fetchMp3Url(req, res, id);
	} catch(err) {
		console.log('err: ' + err);
	}
	//res.send('get song: ' + strSong);
});

app.get('/mp3_karaoke', function (req, res) {
	var id = req.query.id;
	console.log('/mp3_karaoke/' + id);

	try {
		_fetchKaraoke(req, res, id);
	} catch(err) {
		console.log('err: ' + err);
	}
	//res.send('get song: ' + strSong);
});

app.get('/list_song', function (req, res) {
	var artist = req.query.artist;
	var page = req.query.page;
	if (page === undefined) page = 0;
	console.log('/list_song/' + artist);
	liblistsong.getSongByArtist(artist, page, {
		onSuccess: function(result) {
			res.send({
				error: 0,
				msg: result
			});
		}, onError: function(err) {
			res.send({
				error: -1,
				msg: err
			});
		}
	});
	//res.send('get song: ' + strSong);
});

app.get('/', function (req, res) {
	res.send('nothing');
});

var server = app.listen(_global.port, function () {
	var host = server.address().address
	var port = server.address().port
	console.info("Server started on: http://%s:%s",urlHtml host, port)
});

_cache.on('connect', function() {
    console.info('Redis cache connected');
});
