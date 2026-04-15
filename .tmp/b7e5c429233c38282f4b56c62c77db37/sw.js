import {clientsClaim as workbox_core_clientsClaim} from '/home/amilcar/Repositories/Podium501/node_modules/workbox-core/clientsClaim.mjs';
import {precacheAndRoute as workbox_precaching_precacheAndRoute} from '/home/amilcar/Repositories/Podium501/node_modules/workbox-precaching/precacheAndRoute.mjs';
import {cleanupOutdatedCaches as workbox_precaching_cleanupOutdatedCaches} from '/home/amilcar/Repositories/Podium501/node_modules/workbox-precaching/cleanupOutdatedCaches.mjs';
import {registerRoute as workbox_routing_registerRoute} from '/home/amilcar/Repositories/Podium501/node_modules/workbox-routing/registerRoute.mjs';
import {NavigationRoute as workbox_routing_NavigationRoute} from '/home/amilcar/Repositories/Podium501/node_modules/workbox-routing/NavigationRoute.mjs';
import {createHandlerBoundToURL as workbox_precaching_createHandlerBoundToURL} from '/home/amilcar/Repositories/Podium501/node_modules/workbox-precaching/createHandlerBoundToURL.mjs';/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */








self.skipWaiting();

workbox_core_clientsClaim();


/**
 * The precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
workbox_precaching_precacheAndRoute([
  {
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  },
  {
    "url": "icon-512.png",
    "revision": "f829b914fc47cfc9c0747c119c27cf1b"
  },
  {
    "url": "icon-192.png",
    "revision": "f829b914fc47cfc9c0747c119c27cf1b"
  },
  {
    "url": "_app/immutable/nodes/5.b_93EUOz.js",
    "revision": "708daa70d142cc6ac6211e1dbe31082a"
  },
  {
    "url": "_app/immutable/nodes/4.B_lrxZ6b.js",
    "revision": "3d69321d94775147f0bb8ffb7fb85822"
  },
  {
    "url": "_app/immutable/nodes/3.BLvzMVVZ.js",
    "revision": "c22e473184d7fa9bc72c52d219971dd5"
  },
  {
    "url": "_app/immutable/nodes/2.Cx4ZCU-0.js",
    "revision": "259e7402e586dcbecfbbe4c72d7c955e"
  },
  {
    "url": "_app/immutable/nodes/1.DwUJ4jKk.js",
    "revision": "6d03b0f493c5c946987003ccd541829e"
  },
  {
    "url": "_app/immutable/nodes/0.pAPxOYA2.js",
    "revision": "1dacd3cc001ff8d4cdb8e22bf7fb03b5"
  },
  {
    "url": "_app/immutable/entry/start.DalNuWcT.js",
    "revision": "1a6d84f4902484f8ad0214b4a4e1b051"
  },
  {
    "url": "_app/immutable/entry/app.FZfuUeUB.js",
    "revision": "b546161127fb3a2e574fdfa31b08e7da"
  },
  {
    "url": "_app/immutable/chunks/saUQuxG2.js",
    "revision": "80429331173d69787e798215c8f1b7b3"
  },
  {
    "url": "_app/immutable/chunks/dkefRBbT.js",
    "revision": "20f246c73d4a914d54456a7dc4fcf159"
  },
  {
    "url": "_app/immutable/chunks/QCZp6ZdY.js",
    "revision": "81580ceac209631ce7f073a9b417b97f"
  },
  {
    "url": "_app/immutable/chunks/K0vkoPa4.js",
    "revision": "456596b31f337b9e0ed2a304041db897"
  },
  {
    "url": "_app/immutable/chunks/DxS8D4FF.js",
    "revision": "7b71f067b83caf5c70b265d1b6981acf"
  },
  {
    "url": "_app/immutable/chunks/DlF3Ap7j.js",
    "revision": "a4aaf88299e315d757bd347a9ebe4de6"
  },
  {
    "url": "_app/immutable/chunks/DZRd9eFc.js",
    "revision": "1d487ff946b8b7d35da4104bac56c70c"
  },
  {
    "url": "_app/immutable/chunks/DOpdIgVE.js",
    "revision": "7a7903a00b87748bf58a2fa22e978e14"
  },
  {
    "url": "_app/immutable/chunks/D8bEiLAt.js",
    "revision": "2d52f860e8a4d3c086ea1c01a4343fba"
  },
  {
    "url": "_app/immutable/chunks/CpJaNNih.js",
    "revision": "a36be036b370ffc8432a80e4d083d811"
  },
  {
    "url": "_app/immutable/chunks/Cfm55dPr.js",
    "revision": "c7b700b96c11491b994c1f38d89c1105"
  },
  {
    "url": "_app/immutable/chunks/CH1RVgsa.js",
    "revision": "8386c98cc20e759a3e6c303f7cdfb246"
  },
  {
    "url": "_app/immutable/chunks/C8wWOFIB.js",
    "revision": "c48bb3138065f0a3ef4dd09fd792bd8e"
  },
  {
    "url": "_app/immutable/chunks/C30Ri3vB.js",
    "revision": "eeec0168632116ba2d9ade5a14592730"
  },
  {
    "url": "_app/immutable/chunks/BidAqcO9.js",
    "revision": "ddf8f7aebb3119a8d48f487b83bf401c"
  },
  {
    "url": "_app/immutable/chunks/B-Or4_Vb.js",
    "revision": "bbb8474cf9ee1b65cbdce8bb43b43933"
  },
  {
    "url": "_app/immutable/assets/5.B7PGHBCo.css",
    "revision": "7e2d739ed827ae6fabe93d813ebe4009"
  },
  {
    "url": "_app/immutable/assets/4.DycN9OEe.css",
    "revision": "b35d29aba170fc200c1ed1bf4997cfc0"
  },
  {
    "url": "_app/immutable/assets/3.2oS7OAFQ.css",
    "revision": "15a48ac9895cc06e7295780bf5efb876"
  },
  {
    "url": "_app/immutable/assets/2.DohWS2tr.css",
    "revision": "bcf1fe8c45626d7fcbdf2baa7c103557"
  },
  {
    "url": "_app/immutable/assets/0.BUIhak6q.css",
    "revision": "a7daf6742e9a437da9a21a1548d70eff"
  },
  {
    "url": "icon-192.png",
    "revision": "f829b914fc47cfc9c0747c119c27cf1b"
  },
  {
    "url": "icon-512.png",
    "revision": "f829b914fc47cfc9c0747c119c27cf1b"
  },
  {
    "url": "manifest.webmanifest",
    "revision": "abb0c8abe583651f0e35b7ccf9a869d5"
  }
], {});
workbox_precaching_cleanupOutdatedCaches();
workbox_routing_registerRoute(new workbox_routing_NavigationRoute(workbox_precaching_createHandlerBoundToURL("index.html")));






