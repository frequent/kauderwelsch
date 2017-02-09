/*jslint indent: 2*/
/*global self, fetch, Request, Response, console, location */
(function (self, fetch, Request, Response, console, location) {
  "use strict";

  // DEBUG:
  // chrome://cache/
  // chrome://inspect/#service-workers
  // chrome://serviceworker-internals/
  // 
  // bar = new Promise(function (resolve, reject) {
  //   return caches.keys()
  //     .then(function (result) {
  //      console.log(result);
  //      return caches.open(result[0])
  //        .then(function(cache){
  //          return cache.keys()
  //            .then(function (request_list) {
  //              console.log(request_list);
  //              console.log("DONE");
  //              resolve();
  //            });
  //        });
  //    });
  //});
  //
  // clear last cache
  // caches.keys().then(function(key_list) {console.log(key_list);return caches.open(key_list[0]);}).then(function(cache) {return cache.keys().then(function(request_list) {console.log(request_list); return cache.delete(request_list[0]);})});
  // list all caches
  // caches.keys().then(function(key_list) {console.log(key_list);return caches.open(key_list[0]);}).then(function(cache) {return cache.keys().then(function(request_list) {console.log(request_list);})});

  // here we go:
  // https://github.com/PolymerElements/platinum-sw/blob/master/service-worker.js
  //self.param_dict = deserializeUrlParameters(location.search.substring(1));
  
  console.log(self.param_dict)
  

}(self, fetch, Request, Response, console, location));

