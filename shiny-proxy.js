// 
// shiny-proxy.js: A shiny proxy server using sockjs
//
// [browser] <-----sockjs-----> [shiny-proxy] <----websockets----> [shiny app]
// 
// Currently supports only one client and one shiny app
//
// Call like:
//
// node shiny-proxy.js
//
// And edit the below SHINY object
//
//
SHINY = {
   forward_addr: '127.0.0.1',
   forward_port: 9000,
   listen_addr: '0.0.0.0',
   listen_port: 8000
};

var util = require('util'),
    http = require('http'),
    httpProxy = require('http-proxy'),
    sockjs = require('sockjs'),
    websocket = require('faye-websocket');


var sockjs_server = sockjs.createServer();

sockjs_server.on('connection', function(conn) {
   
   // Forwarding Message Queue
   var fmq = [];

   var ws = new websocket.Client('ws://'+SHINY.forward_addr+':'+SHINY.forward_port+'/'); 

	var ws_is_open = false;

   ws.onopen = function(event){
		ws_is_open = true;
		var i;

      console.log("conn: "+conn.url+" ws open");

      if (fmq.length){
			for (i = 0; i < fmq.length; i++){
         	ws.send(fmq[i]);
			}
			fmq = [];
      }
   }

   ws.onmessage = function(event){
      console.log("conn: "+conn.url+" ws message");
      conn.write(event.data);
   };

   ws.onclose = function(event){
      console.log("conn: "+conn.url+" ws close");
      conn.close();
      ws.close();
   };

   conn.on('data', function(message) {
      console.log('conn: '+conn.url+' data');
      if (ws_is_open){
         ws.send(message);
      } else {
         fmq.push(message);
      }
   });

   conn.on('close', function(message){
      console.log('conn: '+conn.url+' close');
      ws.close();
      conn.close();
   });
});

var proxy = httpProxy.createServer(SHINY.forward_port, SHINY.forward_addr);

sockjs_server.installHandlers(proxy, {prefix:'/sockjs'});

proxy.listen(SHINY.listen_port,SHINY.listen_addr);
