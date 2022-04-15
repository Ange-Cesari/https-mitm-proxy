'use strict'
/**
 *  Par HTTP MITM L’agent modifie le contenu HTML
 */
const http = require('http');
const url = require('url');
const through = require('through2');
const net = require('net');

let httpMitmProxy = new http.Server();
// Port de départ
let port = 6789;

httpMitmProxy.listen(port, () => {
    console.log(`Agent intermédiaire HTTP démarré avec succès, port：${port}`);
});
// Le mandataire reçoit les demandes de transmission des clients
httpMitmProxy.on('request', (req, res) => {

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

    // Supprimer la compression prise en charge par les demandes des clients directement pour plus de commodité
    delete options.headers['accept-encoding'];

    console.log(`Options de requêtes :${options.method}, adresse de la demande :${options.protocol}//${options.hostname}:${options.port}${options.path}`);

    // Lancer une requête vers le véritable serveur cible en fonction d’une requête client.
    let realReq = http.request(options, (realRes) => {

        // Définir la tête http de la réponse client
        Object.keys(realRes.headers).forEach(function(key) {
            res.setHeader(key, realRes.headers[key]);
        });

        // Établissement du code d’état de la réponse du client
        res.writeHead(realRes.statusCode);

        // Déterminer si le contenu de la réponse est html par le responsable http de la réponse
        if (/html/i.test(realRes.headers['content-type'])) {
            realRes.pipe(through(function(chunk, enc, callback) {
                let chunkString = chunk.toString();
                // js code pour alerte injecté dans html
                let script = '<script>alert("Hello https-mitm-proxy-handbook!")</script>'
                chunkString = chunkString.replace(/(<\/head>)/ig, function (match) {
                    return  script + match;
                });
                this.push(chunkString);
                callback();
            })).pipe(res);
        } else {
            realRes.pipe(res);
        }

    });

    // Transfert de contenu de requête client vers le serveur cible via pipe
    req.pipe(realReq);

    realReq.on('error', (e) => {
        console.error(e);
    })
})

httpMitmProxy.on('error', (e) => {
    if (e.code == 'EADDRINUSE') {
        console.error('Échec du démarrage de l’agent intermédiaire HTTP！！');
        console.error(`port：${port}，A été occupé.`);
    } else {
        console.error(e);
    }
});
