"use strict";
/**
 *  HTTP Tunnel
 */
const http = require("http");
const url = require("url");
const net = require("net");

let httpTunnel = new http.Server();
// Port de départ
let port = 6789;

httpTunnel.listen(port, () => {
  console.log(`Agent intermédiaire HTTP démarré avec succès, port：${port}`);
});

httpTunnel.on("error", (e) => {
  if (e.code == "EADDRINUSE") {
    console.error("L’agent intermédiaire HTTP n’a pas démarré !！");
    console.error(`Port : $ {port}, déjà occupé.`);
  } else {
    console.error(e);
  }
});

// Les demandes pour https sont transmises via http tunnel
httpTunnel.on("connect", (req, cltSocket, head) => {
  // connect to an origin server
  var srvUrl = url.parse(`https://${req.url}`);

  console.log(`CONNECT ${srvUrl.hostname}:${srvUrl.port}`);

  var srvSocket = net.connect(srvUrl.port, srvUrl.hostname, () => {
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
    console.error("error : ");
    console.error(e);
  });
});
