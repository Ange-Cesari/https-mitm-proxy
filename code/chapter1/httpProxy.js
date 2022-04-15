'use strict'
/**
 * Proxy HTTP
 */
const http = require('http');
const url = require('url');
const net = require('net');

let httpProxy = new http.Server();
//Port de départ
let port = 6789;

httpProxy.listen(port, () => {
    console.log(`Agent intermédiaire HTTP démarré avec succès, port：${port}`);
});
// Le mandataire reçoit les demandes de transmission des clients
httpProxy.on('request', (req, res) => {

    // Résolution des demandes des clients
    var urlObject = url.parse(req.url);
    let options =  {
        protocol: 'http:',
        hostname: req.headers.host.split(':')[0],
        method: req.method,
        port: req.headers.host.split(':')[1] || 80,
        path: urlObject.path,
        headers: req.headers
    };

    console.log(`Comment demander :${options.method}，Adresse de la demande：${options.protocol}//${options.hostname}:${options.port}${options.path}`);

    // Lancer une requête vers le véritable serveur cible en fonction d’une requête client.
    let realReq = http.request(options, (realRes) => {

        // Définir la tête http de la réponse client
        Object.keys(realRes.headers).forEach(function(key) {
            res.setHeader(key, realRes.headers[key]);
        });

        // Établissement du code d’état de la réponse du client
        res.writeHead(realRes.statusCode);

        // Transmettre le contenu de la réponse réelle du serveur aux clients par pipe
        realRes.pipe(res);
    });

    // Transfert de contenu de requête client vers le serveur cible via pipe
    req.pipe(realReq);

    realReq.on('error', (e) => {
        console.error(e);
    })
})

httpProxy.on('error', (e) => {
    if (e.code == 'EADDRINUSE') {
        console.error('Échec du démarrage de l’agent intermédiaire HTTP！！');
        console.error(`port：${port}，A été occupé.`);
    } else {
        console.error(e);
    }
});

// // Les demandes pour https sont transmises via http tunnel
// httpProxy.on('connect', (req, cltSocket, head) => {
//   // connect to an origin server
//   var srvUrl = url.parse(`http://${req.url}`);
//   var srvSocket = net.connect(srvUrl.port, srvUrl.hostname, () => {
//     cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
//                     'Proxy-agent: MITM-proxy\r\n' +
//                     '\r\n');
//     srvSocket.write(head);
//     srvSocket.pipe(cltSocket);
//     cltSocket.pipe(srvSocket);
//   });
//   srvSocket.on('error', (e) => {
//       console.error(e);
//   });
// });
