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
  self.param_dict = deserializeUrlParameters(location.search.substring(1));
  console.log(self.param_dict)
  if (self.param_dict.has('worker')) {
    //importScripts.apply(null, self.param_dict["worker"]);
    importScripts(self.param_dict.get("worker"))
  }
  console.log("yeah")
  try {
    hello(123)
  } catch (e) {
    console.log(e)
  }
  if (self.param_dict.has('prefetch_url_list')) {
    console.log("let's fetch")
    console.log(self.param_dict.get("prefetch_url_list"))
    PREFETCH_URL_LIST = [self.param_dict.get('prefetch_url_list')];
  }
  console.log("prefetch")
  
  /*
  self.DOMParser = {};
  self.sessionStorage = {};
  self.localStorage = {};
  self.openDatabase = {};
  self.DOMError = {};
  self.postMessage = function () {return; };

  self.importScripts('rsvp.js', 'jiodev.js');

  self.storage = {};

  function createStorage(database) {
    return self.jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "indexeddb",
        database: database
      }
    });
  }

  self.addEventListener("message", function (event) {

    event.waitUntil(new self.RSVP.Queue()
      .push(function () {
        var data = JSON.parse(event.data);

        if (data.action === "install" &&
            data.url_list !== undefined) {

          self.storage = createStorage(self.registration.scope);
          return new self.RSVP.Queue()
            .push(function () {
              var promise_list = [];
              data.url_list.map(function (url) {
                promise_list.push(
                  new self.RSVP.Queue()
                    .push(function () {
                      return self.storage.get(url);
                    })
                    .push(undefined, function () {
                      return new self.RSVP.Queue()
                        .push(function () {
                          return fetch(new Request(url));
                        })
                        .push(function (response) {
                          if (response.status === 200) {
                            return self.RSVP.all([
                              self.storage.put(
                                url,
                                {"content_type": "blob"}
                              ),
                              response.blob()
                            ]);
                          }
                          throw new Error(response.statusText);
                        })
                        .push(function (result) {
                          return self.storage.putAttachment(
                            url,
                            "body",
                            result[1]
                          );
                        })
                        .push(function () {
                          console.log("Saved: ", url);
                        })
                        .push(undefined, function (error) {
                          console.log(
                            "error on",
                            url,
                            "cause: ",
                            error.message
                          );
                        });
                    })
                );
              });
              return self.RSVP.all(promise_list);
            })
            .push(function () {
              event.ports[0].postMessage("success");
            });
        }
      }));
  });

  self.addEventListener("fetch", function (event) {
    var relative_url = event.request.url.replace(self.registration.scope, "")
      .replace(self.version_url, "");
    if (relative_url === "") {
      relative_url = "/";
    }

    event.respondWith(
      new self.RSVP.Queue()
        .push(function () {
          if (self.storage.get === undefined) {
            self.storage = createStorage(self.registration.scope);
          }
          return self.storage.get(relative_url);
        })
        .push(function (doc) {
          if (doc.content_type !== "blob") {
            return new Response(doc.text_content, {
              'headers': {
                'content-type': doc.content_type
              }
            });
          }
          return self.storage.getAttachment(relative_url, "body")
            .push(function (blob) {
              return new Response(blob, {
                'headers': {
                  'content-type': blob.type
                }
              });
            });
        })
        .push(undefined, function (error) {
          console.log(
            "Relative_Url: ",
            relative_url,
            "\nCause: ",
            error.message
          );
          return fetch(event.request);
        })
    );
  });
*/
}(self, fetch, Request, Response, console, location));
