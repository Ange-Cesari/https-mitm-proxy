"use strict";
/**
 *  HTTP Tunnel
 */
const https = require("https");
const http = require("http");
const url = require("url");
const net = require("net");
const forge = require("node-forge");
const pki = forge.pki;
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const tls = require("tls");
const axios = require("axios");

let httpTunnel = new http.Server();
// Port de départ
let port = 6789;

let content = "";
let html = "";

let wl = ["www.facebook.com", "www.google.com"];

httpTunnel.listen(port, () => {
  console.log(
    `Simple HTTPS Intermediary Agent démarré avec succès, port :${port}`
  );
});

httpTunnel.on("error", (e) => {
  if (e.code == "EADDRINUSE") {
    console.error("Échec du démarrage de l’agent intermédiaire HTTP！！");
    console.error(`port：${port}，Occupé.`);
  } else {
    console.error(e);
  }
});

const caCertPath = path.join(__dirname, "../../rootCA/localIsen.crt");
const caKeyPath = path.join(__dirname, "../../rootCA/localIsen.key.pem");
fs.readFileSync(caCertPath);
fs.readFileSync(caKeyPath);
const caCertPem = fs.readFileSync(caCertPath);
const caKeyPem = fs.readFileSync(caKeyPath);
var caCert = forge.pki.certificateFromPem(caCertPem);
var caKey = forge.pki.privateKeyFromPem(caKeyPem);

var body = "";

// Les demandes pour https sont transmises via http tunnel
httpTunnel.on("connect", (req, cltSocket, head) => {
  // connect to an origin server

  var srvUrl = url.parse(`https://${req.url}`);

  //console.log(`CONNECT ${srvUrl.hostname}:${srvUrl.port}`);
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

function createFakeHttpsWebSite(domain, successFun) {
  createFakeCertificateByDomain(caKey, caCert, domain, true);
  mkdirp.sync(path.join(__dirname, "../../cert"));
  var fakeServer = new https.Server({
    key: fs.readFileSync(path.join(__dirname, `../../cert/${domain}.key`)),
    cert: fs.readFileSync(path.join(__dirname, `../../cert/${domain}.crt`)),
    SNICallback: (hostname, done) => {
      let certObj = createFakeCertificateByDomain(
        caKey,
        caCert,
        hostname,
        false
      );
      done(
        null,
        tls.createSecureContext({
          key: pki.privateKeyToPem(certObj.key),
          cert: pki.certificateToPem(certObj.cert),
        })
      );
    },
  });

  fakeServer.listen(0, () => {
    var address = fakeServer.address();
    successFun(address.port);
  });

  fakeServer.on("request", (req, res) => {
    // Résolution des demandes des clients
    var urlObject = url.parse(req.url);
    const url2 = "https://" + domain + urlObject.path;
    axios({
      method: req.method,
      url: url2,
    })
      .then((response) => {
        for (let i = 0; i < wl.length; i++) {
          const element = wl[i];
          if (element == domain) {
            html = response.data;
            content = response.headers["content-type"];
          } else {
            html = fs.readFileSync(
              path.join(__dirname, `../../code/chapter5/error.html`)
            );
            content = "text/html";
          }
          break;
        }
        res.writeHead(200, { "Content-Type": content });
        res.write(html);
        res.end();
      })
      .catch(console.error);
  });

  fakeServer.on("error", (e) => {
    console.error(e);
  });
}

function createFakeCertificateByDomain(caKey, caCert, domain, test) {
  //console.log(test);
  var keys = pki.rsa.generateKeyPair(2048);
  var cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;

  cert.serialNumber = new Date().getTime() + "";
  cert.validity.notBefore = new Date();
  cert.validity.notBefore.setFullYear(
    cert.validity.notBefore.getFullYear() - 1
  );
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

  var attrs = [
    {
      name: "commonName",
      value: domain,
    },
    {
      name: "countryName",
      value: "Frrance",
    },
    {
      shortName: "ST",
      value: "Var",
    },
    {
      name: "localityName",
      value: "Toulon",
    },
    {
      name: "organizationName",
      value: "isen",
    },
    {
      shortName: "OU",
      value: "https://github.com/lerey34/",
    },
  ];

  cert.setIssuer(caCert.subject.attributes);
  cert.setSubject(attrs);

  cert.setExtensions([
    {
      name: "basicConstraints",
      critical: true,
      cA: false,
    },
    {
      name: "keyUsage",
      critical: true,
      digitalSignature: true,
      contentCommitment: true,
      keyEncipherment: true,
      dataEncipherment: true,
      keyAgreement: true,
      keyCertSign: true,
      cRLSign: true,
      encipherOnly: true,
      decipherOnly: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
    {
      name: "extKeyUsage",
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: "authorityKeyIdentifier",
    },
  ]);
  cert.sign(caKey, forge.md.sha256.create());

  if (test == false) {
    return {
      key: keys.privateKey,
      cert: cert,
    };
  } else {
    var certPem = pki.certificateToPem(cert);
    var keyPem = pki.privateKeyToPem(keys.privateKey);
    //  console.log(certPem);
    //  console.log(keyPem);

    mkdirp.sync(path.join(__dirname, "../../cert"));
    fs.writeFileSync(path.join(__dirname, `../../cert/${domain}.crt`), certPem);
    fs.writeFileSync(path.join(__dirname, `../../cert/${domain}.key`), keyPem);
  }
}
