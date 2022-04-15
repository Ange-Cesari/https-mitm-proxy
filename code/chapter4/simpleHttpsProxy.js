"use strict";
/**
 *  HTTP Tunnel
 */
const http = require("http");
const url = require("url");
const net = require("net");
const createFakeHttpsWebSite = require("./createFakeHttpsWebSite");

let httpTunnel = new http.Server();
// Port de départ
let port = 6789;

httpTunnel.listen(port, () => {
  console.log(`Simple HTTPS Intermediary Agent démarré avec succès, port :${port}`);
});

httpTunnel.on("error", (e) => {
  if (e.code == "EADDRINUSE") {
    console.error("L’agent intermédiaire HTTP n’a pas démarré !！");
    console.error(`Ports :${port}，A été occupé.`);
  } else {
    console.error(e);
  }
});

// Les demandes pour https sont transmises via http tunnel
httpTunnel.on("connect", (req, cltSocket, head) => {
  // connect to an origin server
  var srvUrl = url.parse(`https://${req.url}`);

  console.log(`CONNECT ${srvUrl.hostname}:${srvUrl.port}`);

  createFakeHttpsWebSite(srvUrl.hostname, (port) => {
    var srvSocket = net.connect(port, "127.0.0.1", () => {
      cltSocket.write(
        "HTTP/1.1 200 Connection Established\r\n" +
          "Proxy-agent: MITM-proxy\r\n" +
          "\r\n"
      );
      srvSocket.write(head);
      srvSocket.pipe(cltSocket);
      cltSocket.pipe(srvSocket);
    });
    srvSocket.on("error", (e) => {
      console.error(e);
    });
  });
});
