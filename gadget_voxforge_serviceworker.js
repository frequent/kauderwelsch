/*jslint indent: 2*/
/*global self, fetch, Request, Response, console, location, JSON */
(function (self, fetch, Request, Response, console, location, JSON) {
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
  
  var PREFETCH_URL_LIST = [];
  var CURRENT_CACHE_VERSION = 1;
  var CURRENT_CACHE;
  var CURRENT_CACHE_DICT = {
    "self": "self-v" + CURRENT_CACHE_VERSION
  };
  var STORAGE = null;
  console.log("importing")
  importScripts(
    "rsvp.latest.js",
    "jio.latest.js",
    "jio.parallelstorage.js",
    "jio.cachestorage.js",
    "jio.indexstorage.js"
  );
  console.log("importing done")
  // methods
  // XXX allow passing multiple files
  function deserializeUrlParameters(query_string) {
    return new Map(query_string.split('&').map(function(key_value_pair) {
      var splits = key_value_pair.split('=');
      var key = decodeURIComponent(splits[0]);
      var value = decodeURIComponent(splits[1]);
      if (value.indexOf(',') >= 0) {
        value = value.split(',');
      }
  
      return [key, value];
    }));
  }
  
  // custom loopEventListener
  function workerLoopEventListener(my_target, my_type, my_callback) {
    var handle_event_callback,
      callback_promise;

    function cancelResolver() {
      if ((callback_promise !== undefined) &&
        (typeof callback_promise.cancel === "function")) {
        callback_promise.cancel();
      }
    }
    function canceller() {
      cancelResolver();
    }
    function itsANonResolvableTrap(resolve, reject) {
      handle_event_callback = function (evt) {
        cancelResolver();
        callback_promise = new RSVP.Queue()
          .push(function () {
            return my_callback(evt);
          })
          .push(undefined, function (error) {
            if (!(error instanceof RSVP.CancellationError)) {
              canceller();
              reject(error);
            }
          });
      };
      // eg object.onfirstpass = function () {...
      my_target["on" + my_type] = my_callback;
    }
    return new RSVP.Promise(itsANonResolvableTrap, canceller);
  }
  
  // runs while an existing worker runs or nothing controls the page (update here)
  function installHandler(event) {
    console.log("Install handler called");
    //event.waitUntil(
    return new RSVP.Queue() 
      .push(function () {
        return event.waitUntil(caches.open(CURRENT_CACHE_DICT.dictionary));
      })
      .push(function(cache) {
        var cache_promise_list = PREFETCH_URL_LIST.map(function(prefetch_url) {

          // check if file is already on cache
          return new RSVP.Queue()
            .push(function () {
              return cache.match(prefetch_url);
            })
            .push(function(cached_file_response) {
              var request,
                url;
      
              // file is not on cache yet
              if (!cached_file_response) {
                console.log("loading ", prefetch_url, " to be cached.")
                
                // This constructs a new URL object using the service worker's script
                // location as the base for relative URLs.
                url = new URL(prefetch_url, location.href);
      
                // Append a cache-bust=TIMESTAMP URL parameter to each URL's query 
                // string. This is particularly important when precaching resources 
                // that are later used in the fetch handler as responses directly, 
                // without consulting the network (i.e. cache-first). If we were to 
                // get back a response from the HTTP browser cache for this precaching 
                // request then that stale response would be used indefinitely, or at 
                // least until the next time the service worker script changes 
                // triggering the install flow.
                url.search += (url.search ? '&' : '?') + 'cache-bust=' +  Date.now();
          
                // It's very important to use {mode: 'no-cors'} if there is any chance
                // that the resources being fetched are served off of a server that 
                // doesn't support CORS. See
                // (http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).
                // If the server doesn't support CORS the fetch() would fail if the 
                // default mode of 'cors' was used for the fetch() request. The drawback
                // of hardcoding {mode: 'no-cors'} is that the response from all 
                // cross-origin hosts will always be opaque
                // (https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#cross-origin-resources)
                // and it is not possible to determine whether an opaque response 
                // represents a success or failure
                // (https://github.com/whatwg/fetch/issues/14).
                request = new Request(url, {mode: 'no-cors'});
      
                // XXX differentiate handler based on desired content-type? 
                // (ArrayBuffer, BinaryString, DataUrl, String)
                return new RSVP.Queue()
                  .push(function () {
                    return fetch(request);
                  })  
                  .push(function(response) {
                    if (response.status >= 400) {
                      throw new Error('request for ' + prefetch_url +
                        ' failed with status ' + response.statusText);
                    }
                    return response.blob(); 
                  });
              }
              console.log("FILE IS ALREADY CACHED");
              return cached_file_response.blob();
            })
            .push(function(blob) {
              return new RSVP.Queue()
                .push(function () {
                  return STORAGE.put("prefetch");
                })
                .push(function () {
                  return STORAGE.putAttachment(blob);
                });
              
            })
            .push(undefined, function(error) {
              console.error('Not caching ' + prefetch_url + ' due to ' + error);
              throw error;
            });
        });

        return RSVP.all(cache_promise_list);
      })
      .push(function () {
        console.log("pre-feteching complete");
  
        // force waiting worker to become active worker (claim)
        // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
        if (self.param_dict.hasOwnProperty('skip_waiting') !== false) {
          self.skipWaiting();
        }
      })
      .push(undefined, function(error) {
        console.error('Pre-fetching failed:', error);
        throw error;
      });
    //);
  }
  
  // intercept network GET/POST requests, add and serve from cache
  function fetchHandler(event) {
        console.log("Fetch handler called");
    if (event.request.method === "GET") {
      return new RSVP.Queue()
        .push(function () {
          return event.respondWith(caches.open(CURRENT_CACHE_DICT["self"]));
        })
        .push(function (cache) {
          return cache.match(event.request);
        })
        .push(function (response) {
          // limit the files to be cached
          var cacheable_list = [],
          isCacheable = function (el) {
            return url.indexOf(el) >= 0;
          };
              
          // cached, return from cache
          if (response) {
            return response;
          }
          
          // not cached, fetch from network
          // clone call, because any operation like fetch/put... will
          // consume the request, so we need a copy of the original
          // (see https://fetch.spec.whatwg.org/#dom-request-clone)
          return new RSVP.Queue()
            .push(function () {
              return fetch(event.request.clone());
            })
            .push(function(response) {
                  
              // add resource to cache
              if (response.status < 400 && cacheable_list.some(isCacheable)) {
                  cache.put(event.request, response.clone());
              }
              return response;
            });
        })
        .push(undefined, function(error) {
  
          // This catch() will handle exceptions that arise from the match()
          // or fetch() operations. Note that a HTTP error response (e.g.
          // 404) will NOT trigger an exception. It will return a normal 
          // response object that has the appropriate error code set.
          console.log(error);
          throw error;
        });
      
  
    //  we could also handle post here and handle this through storage
    //} else {
    //  event.respondWith(fetch(event.request));
    }
  }

  // storage communication
  function messageHandler(event) {
    console.log("Message handler called");
    var data = event.data;
    switch (data.command) {
      case 'post':
        
        // data.param should include apply-ed arguments, the sub_storage
        // has to cope with whatever is being passed.
        
        // event.ports[0] corresponds to the MessagePort that was transferred 
        // as part of the controlled page's call to controller.postMessage(). 
        // Therefore, event.ports[0].postMessage() will trigger the onmessage
        // handler from the controlled page. It's up to you how to structure 
        // the messages that you send back; this is just one example.

        return event.port[0].postMessage(
          STORAGE.post.apply(self, data.param)
        );
      case 'get':
        return event.port[0].postMessage(
          STORAGE.get.apply(self, data.param)
        );
      case 'put':
        return event.port[0].postMessage(
          STORAGE.put.apply(self, data.param)
        );
      case 'remove':
        return event.port[0].postMessage(
          STORAGE.remove.apply(self, data.param)
        );
      case 'allDocs':
        return event.port[0].postMessage(
          STORAGE.allDocs.apply(self, data.param)
        );
      case 'allAttachments':
        return event.port[0].postMessage(
          STORAGE.allAttachments.apply(self, data.param)
        );
      case 'removeAttachment':
        return event.port[0].postMessage(
          STORAGE.removeAttachment.apply(self, data.param)
        );
      case 'putAttachment':
        return event.port[0].postMessage(
          STORAGE.putAttachment.apply(self, data.param)
        );
      case 'getAttachment':
        return event.port[0].postMessage(
          STORAGE.getAttachment.apply(self, data.param)
        );
      default:
        throw 'Unknown command: ' + event.data.command;
    }
  }

  // runs active page, changes here (like deleting old cache) breaks page
  function activateHandler(event) {
    console.log("Activate handler called")
    var expected_cache_name_list = Object.keys(CURRENT_CACHE_DICT).map(function(key) {
      return CURRENT_CACHE_DICT[key];
    });
  
    //event.waitUntil(
    // XXX used ot be waitUntil(.... everything in here, caches.keys.then(function....)
    return new RSVP.Queue()
      .push(function() {
        return event.waitUntil(caches.keys());
      })
      .push(function(cache_name_list) {
        return RSVP.all(
          cache_name_list.map(function(cache_name) {
            version = cache_name.split("-v")[1];
            
            // removes caches which are out of version
            if (!(version && parseInt(version, 10) === CURRENT_CACHE_VERSION)) {
              console.log('Deleting out of date cache:' + cache_name);
              return caches.delete(cache_name);
            }
            
            // removes caches which are not on the list of expected names 
            if (expected_cache_name_list.indexOf(cache_name) === -1) {
              console.log('Deleting non-listed cache:' + cache_name);
              return caches.delete(cache_name);
            }
          }));
      })
      .push(function () {
        console.log("'activate': Claiming clients for version");
        if (self.param_dict.hasOwnProperty('clients_claim') !== false) {
          return self.clients.claim();
        }
      });
      //);
  }
  
  console.log("done, is RSVP defined?")
  console.log(RSVP)
  // here we go
  return new RSVP.Queue()
    .push(function () {
      
      // https://github.com/PolymerElements/platinum-sw/blob/master/service-worker.js
      self.param_dict = deserializeUrlParameters(location.search.substring(1));
      
      console.log(self.param_dict)
      // importScripts.apply(null, self.param_dict.get("xxx"))
      
      // shelve files to load on install
      if (self.param_dict.has('prefetch_url_list')) {
        PREFETCH_URL_LIST = [self.param_dict.get('prefetch_url_list')];
      }
      console.log("creating JIO")
      console.log(JSON.parse(self.param_dict.get("sub_storage")))
      return jIO.createJIO(JSON.parse(self.param_dict.get("sub_storage")));
    })
    .push(function (my_jio_storage) {
      STORAGE = my_jio_storage;
      
      return RSVP.all([
        //  workerLoopEventListener(self, "fetch", fetchHandler),
        workerLoopEventListener(self, "install", installHandler),
        workerLoopEventListener(self, "activate", activateHandler),
        workerLoopEventListener(self, "message", messageHandler)
      ]);
    })
    .push(undefined, function (my_error) {
      console.log(my_error);
      throw my_error;
    });

}(self, fetch, Request, Response, console, location, JSON));

