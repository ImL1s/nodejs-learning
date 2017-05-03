/* url模組基本使用 */

var http = require("http");
var url = require("url");

var server = http.createServer(function(req,res){
    console.log("** request comming **")
    // url.parse()可以將一個完整的URL地址分為很多部分
    // host、port、pathname、path、query
    var host = url.parse(req.url).host;
    var port = url.parse(req.url).port;
    var pathname = url.parse(req.url).pathname;
    var path = url.parse(req.url).path;
    var query = url.parse(req.url).query;
    
    // url.parse()如果第二個參數是true,就會將query字串轉成可以用.訪問的物件
    var queryObj = url.parse(req.url,true).query;

    console.log('host:'+host);
    console.log('port:'+port);
    console.log('pathname:'+pathname);
    console.log('path:'+path);
    console.log('query:'+query);
    console.log('queryObj.queryValue:'+queryObj.queryValue1);

    res.end();
});

server.listen(3000);

