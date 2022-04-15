/**
 * Générer un certificat racine
 */

console.log("Générer un certificat racine\n");

const forge = require("node-forge");
const pki = forge.pki;
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");

var keys = pki.rsa.generateKeyPair(2048);
var cert = pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = new Date().getTime() + "";
cert.validity.notBefore = new Date();
cert.validity.notBefore.setFullYear(cert.validity.notBefore.getFullYear() - 5);
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 20);
var attrs = [
  {
    name: "commonName",
    value: "rootCAIsen",
  },
  {
    name: "countryName",
    value: "France",
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
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([
  {
    name: "basicConstraints",
    critical: true,
    cA: true,
  },
  {
    name: "keyUsage",
    critical: true,
    keyCertSign: true,
  },
  {
    name: "subjectKeyIdentifier",
  },
]);

// self-sign certificate
cert.sign(keys.privateKey, forge.md.sha256.create());

var certPem = pki.certificateToPem(cert);
var keyPem = pki.privateKeyToPem(keys.privateKey);
var certPath = path.join(__dirname, "../../rootCA/localIsen.crt");
var keyPath = path.join(__dirname, "../../rootCA/localIsen.key.pem");

console.log("Contenu de la clé publique：\n");
console.log(certPem);
console.log("Contenu de la clé privée：\n");
console.log(keyPem);
console.log(`Chemin de stockage des clés publiques：\n ${certPath}\n`);
console.log(`Chemin de stockage des clés privées：\n ${keyPath}\n`);

mkdirp.sync(path.join(__dirname, "../../rootCA"));
fs.writeFileSync(certPath, certPem);
fs.writeFileSync(keyPath, keyPem);
