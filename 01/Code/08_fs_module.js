var http = require("http");
var fs = require("fs");

var server = http.createServer(function(req,res){

    if(req.url == "/favicon.ico"){
        return;
    }

    res.setHeader("content-type","text/html; charset=utf-8");

    // // fs.stat([路徑],[callback]) 檢測指定文件狀態
    // fs.stat("./album",function(err,data){

    //     if(err != null){
    //         res.write("album error:" + err +  "/" + data + "<br>");
    //     }else{
    //         res.write("album is directory? :"+ data.isDirectory() + "<br>");
    //     }

    //     fs.stat("./album/bbb",function(err,data){
    //         if(err != null){
    //             res.write("bbb error:" + err);
    //         }else{
    //             res.write("bbb is directory? :"+ data.isDirectory() + "<br>");
    //         }
    //             res.end();                
    //     });
    // });

    // // 異步讀取文件(包括文件夾), Asynchronous readdir(3). Reads the contents of a directory.
    // fs.readdir("./album",function(err,files){
    //     for(var i = 0; i < files.length; i++){
    //         res.write(files[i] + "<br>");
    //     }
    //     res.end();
    // });


    var files = [];
    fs.readdir("./album",function(err,files){
        for(var i = 0; i < files.length; i++){
            var fileName = files[i];
            fs.stat("./album/"+fileName,function(err,files){
                console.log(fileName);
            });
        }
        res.end(files+"");
    });

});

server.listen(3000,"127.0.0.1");