# url模組

## 基本使用
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

## 提交表單練習

### html部分
    <html>
    <head>
        <meta http-equiv="content-type" content="text/html" charset="utf-8">
    </head>
    <body>
        <form action="http://127.0.0.1:3000" method="get">
            <input type="text" name="name" value="sam" >
            <input type="text" name="age" value="16" >
            <input type="text" name="sex" value="f" >
            <input type="submit">
        </form>
    </body>
    </html>

### nodejs部分
    /* 表單提交練習 */

    var http = require("http");
    var url = require("url");

    var server = http.createServer(function(req,res){
        //得到query部分，由於寫了true，那麼就是一個物件
        var queryObj = url.parse(req.url,true).query;
        var name = queryObj.name;
        var age = queryObj.age;
        var sex = queryObj.sex;
        
        res.end("服務器收到了表單請求" + name + age + sex);
    });

    server.listen(3000,"127.0.0.1");



