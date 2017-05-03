// 引入一個模組
var http = require('http');

// 使用工廠方法生成一個server實例
var server = http.createServer(function(req,res){
    console.log('request by browser... hello world!');

    // 指定內容為純文字類型，browser會按照此類型解析end中的內容
    res.setHeader("content-type","text/plain");
    
    // 回應瀏覽器
    res.end("<h1>hi</h1>");
});

// 監聽本機3000 port
server.listen(3000,"127.0.0.1");