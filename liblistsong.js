var cheerio = require("cheerio");
var http = require("http");
var	zlib = require("zlib");

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

// getGzipped(url, function(err, data) {
	
// 	var $ = cheerio.load(data);
	
// 	var urlPaging = '';
// 	var pagingNo = 0;

// 	var btnLast = $('.pagination li:last-child a');
// 	urlPaging = $(btnLast).attr("href");
// 	urlNgheSy = 'http://mp3.zing.vn' + urlPaging.split('=')[0];
// 	pagingNo = urlPaging.split("=")[1];
// 	console.log('urlPaging: ' + urlPaging);
	
// 	var dataId = [];
// 	var songName = [];
// 	var i = 0;
// 	for (var j = 1; j <= pagingNo; j++) {
// 		console.log(urlNgheSy +'='+ j);
// 		getGzipped(urlNgheSy +'='+ j, function(err, data) {
// 			var $ = cheerio.load(data);
// 			$('.fn-song').each(function() {
// 				dataId[i] = $(this).attr("data-id");
// 				songName[i] = $(this).find('a').attr("title");
// 				console.log(dataId[i] + ' : '+ songName[i]);
// 				i++;
// 			});
// 			// for (k = 0; k < dataId.length; k++) {
// 			// 	console.log(dataId[k] + ' : '+ songName[k]);
// 			// }
// 			console.log('len=' + dataId.length);
// 			//break;
// 			console.log(i);
// 		}, function(err) {
// 			console.log('getGzipped on get song list' + url);
// 		});
		
// 	}
// }, function(err) {
// 	console.log('getGzipped error on get page' + url);
// });

module.exports.getSongByArtist = function (artist, page, param) {
	if (page < 1) page = 1;
	var url = 'http://mp3.zing.vn/nghe-si/' + artist + '/bai-hat?&page=' + page;
	getGzipped(url, function(err, data) {
		var $ = cheerio.load(data);
		var urlPaging = '';
		var pagingNo = 0;
		var btnLast = $('.pagination li:last-child a');
		if (btnLast === undefined) {
			if (param.onError !== undefined)
				param.onError('on failed');
			return;
		}

		urlPaging = $(btnLast).attr('href');
		if (urlPaging === undefined) {
			if (param.onError !== undefined)
				param.onError('on failed');
			return;
		}
		
		urlNgheSi = 'http://mp3.zing.vn' + urlPaging.split('=')[0];
		pagingNo = urlPaging.split("=")[1];
		//console.log('pagingNo: ' + pagingNo);
		var listSongObj = $('.fn-song');
		var listSong = [];
		for (var idx=0; idx < listSongObj.length; idx++) {
			var songObj = listSongObj[idx];
			//console.log(songObj);
			songId = $(songObj).attr('data-id');
			songName = $(songObj).find('a').attr('title');
			console.log(songId + ' : '+ songName);
			listSong.push({
				id: songId,
				name: songName
			});
		}
		if (param.onSuccess !== undefined)
			param.onSuccess({
				current_page: page,
				total_page: pagingNo,
				songs: listSong
			});
	}, function(err) {
		if (param.onError !== undefined)
			param.onError(err);
	});
}

// getSongByArtist('Phuong-Linh', 0);
