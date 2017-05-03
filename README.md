# NodeJs-Learning
### 此為某個無名程序員學習NodeJs的筆記,歡迎參考

# Http模組

## Hello world

    // 引入一個模組
    var http = require('http');

    // 使用工廠方法生成一個server實例
    var server = http.createServer(function(req,res){
        console.log('request by browser... hello world!');
    });

    // 監聽本機3000 port
    server.listen(3000,"127.0.0.1");

## 響應請求

##### 在瀏覽器請求後，如果不使用response.end()回應瀏覽器，瀏覽器會不停的轉圈直到timeout。

    // 引入一個模組
    var http = require('http');

    // 使用工廠方法生成一個server實例
    var server = http.createServer(function(req,res){
        console.log('request by browser... hello world!');
        // 回應瀏覽器
        res.end();
    });

    // 監聽本機3000 port
    server.listen(3000,"127.0.0.1");

## 有內容的響應請求

##### 一般在end中會放上這次request的結果，如下:

    var server = http.createServer(function(req,res){
        console.log('request by browser... hello world!');
        // 回應瀏覽器
        res.end("<h1>hi</h1>");
    });

##### 可以看到browser會把end的內容當成html來解析，可是如果就是要讓它直接顯示end所傳送的內容呢? 這時候就要指定content-type了。

    // 使用工廠方法生成一個server實例
    var server = http.createServer(function(req,res){
        console.log('request by browser... hello world!');

        // 指定內容為純文字類型，browser會按照此類型解析end中的內容
        res.setHeader("content-type","text/plain");
        
        // 回應瀏覽器
        res.end("<h1>hi</h1>");
    });


