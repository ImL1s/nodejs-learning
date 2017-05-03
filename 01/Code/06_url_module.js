/* 表單提交練習 */

var http = require("http");
var url = require("url");

var server = http.createServer(function(req,res){
	//得到query部分，由於寫了true，那麼就是一個物件
	var queryObj = url.parse(req.url,true).query;
	var name = queryObj.name;
	var age = queryObj.age;
	var sex = queryObj.sex;
	res.setHeader("content-type","text/plain; charset=utf-8");
	res.end("服務器收到了表單請求: " + name+ " " + age + " " + sex);
});

server.listen(3000,"127.0.0.1");