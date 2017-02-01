/*
 * JIO Service Worker Storage Backend.
 */

// POLYFILL: => https://developer.mozilla.org/en-US/docs/Web/API/Cache
// this polyfill provides Cache.add(), Cache.addAll(), and CacheStorage.match(),
// should not be needed for Chromium > 47 And Firefox > 39
// importScripts('./serviceworker-cache-polyfill.js');

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

// CONFLICTING CONTROLLERS/NO CONTROLLER
// if using same scope (for example ./) => https://github.com/w3c/ServiceWorker/issues/921
// hijack using claim() which triggers oncontrollerchange on other serviceworkers
// => https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
// can also be used to not have to refresh page
// => https://davidwalsh.name/offline-recipes-service-workers
// => https://serviceworke.rs/immediate-claim_service-worker_doc.html

// self.addEventListener('install', function(event) {
//  event.waitUntil(self.skipWaiting());
// });
// self.addEventListener('activate', function(event) {
//  event.waitUntil(self.clients.claim());
// });

// STUFF
// intro => https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
// intro => http://www.html5rocks.com/en/tutorials/service-worker/introduction/
// selective cache => https://github.com/GoogleChrome/samples/blob/gh-pages/service-worker/selective-caching/service-worker.js
// handling POST with indexedDB => https://serviceworke.rs/request-deferrer.html
// prefetch during install => https://googlechrome.github.io/samples/service-worker/prefetch/
// serve range from cache => https://googlechrome.github.io/samples/service-worker/prefetch-video/

// versioning allows to keep a clean cache, current_cache is accessed on fetch
var CURRENT_CACHE_VERSION = 1;
var CURRENT_CACHE;
var CURRENT_CACHE_DICT = {
  "self": "self-v" + CURRENT_CACHE_VERSION,
  "dictionary": "dictionary-v" + CURRENT_CACHE_VERSION
};

var LINE_BREAK = /(.*?[\r\n])/g;
var HAS_LINE_BREAK = /\r|\n/;
var DICTIONARY_URL_LIST = [
  //"VoxForgeDict.txt"
  "sample.txt"
];

// runs while an existing worker runs or nothing controls the page (update here)
self.addEventListener('install', function (event) {

  event.waitUntil(caches.open(CURRENT_CACHE_DICT.dictionary)
    .then(function(cache) {
      var cache_promise_list = DICTIONARY_URL_LIST.map(function(prefetch_url) {
        
        // This constructs a new URL object using the service worker's script
        // location as the base for relative URLs.
        var url = new URL(prefetch_url, location.href),
          request;

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
        return fetch(request)
          .then(function(response) {
            if (response.status >= 400) {
              throw new Error('request for ' + prefetch_url +
                ' failed with status ' + response.statusText);
            }
            
            // ====
            // XXX using Array buffer
            return response.blob(); 
          })
          .then(function(blob) {

            // parse file, remove whitespace, not 2-depths boundaries in index
            function compressAndIndexFile(my_blob) {
              var file_reader = new FileReader(),
                chunk_size = 1024,
                offset = 0,
                boundary_dict = {},
                hang_over = "",
                pos = 0;
              return new Promise(function (resolve, reject) {
                file_reader.onload = function (my_event) {
                  var chunk = my_event.target.result,
                    line_list = chunk.split(LINE_BREAK).filter(Boolean),
                    len = line_list.length,
                    i,
                    iterator,
                    line,
                    request,
                    response;
                  for (i = 0; i < len; i += 1) {
                    line = line_list[i];
                    if (i === 0) {
                      line = hang_over + line;
                      hang_over = "";
                    }
                    iterator = line[0] + (line[1] || "");
                    if (boundary_dict.hasOwnProperty(iterator) === false) {
                      boundary_dict[iterator] = pos;
                    }
                    if (HAS_LINE_BREAK.test(line) === false) {
                      hang_over = line;
                    } else {
                      hang_over = "";
                      pos += line.length;
                    }
                  }
                  offset += chunk_size;
                  if (offset >= my_blob.size) {
                    console.log("done");
                    console.log(my_blob.size);
                    console.log(boundary_dict);
                    request = new Request("index.sample.txt", {mode: 'no-cors'});
                    response = new Response(boundary_dict);
                    return cache.put(request, response)
                      .then(function () {
                        return resolve(new Response(my_blob));
                      });
                    
                  }
                  return loopOverBlob(offset);
                };
                file_reader.onerror = function (my_event) {
                  reject(my_event);
                };
                
                function loopOverBlob(my_offset) {
                  return file_reader.readAsText(
                    blob.slice(my_offset, my_offset += chunk_size)
                  );
                }
                return loopOverBlob(offset);
              });              
            }
            return compressAndIndexFile(blob);
          })
          .then(function(what) {
            console.log("DONE")
            console.log(what)
            return cache.put(prefetch_url, what);
            // ================
            // Use the original URL without the cache-busting parameter as 
            // the key for cache.put().
            // XXX Use jIO interface here, too after moving out the methods
            // return cache.put(prefetch_url, response);
          }).catch(function(error) {
            console.error('Not caching ' + prefetch_url + ' due to ' + error);
          });
      });

      return Promise.all(cache_promise_list).then(function() {
        console.log('Pre-fetching complete.');
      });
    })
    .then(function () {

      // force waiting worker to become active worker (claim)
      // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
      self.skipWaiting();

    }).catch(function(error) {
      console.error('Pre-fetching failed:', error);
    })
  );
});

// runs active page, changes here (like deleting old cache) breaks page
self.addEventListener('activate', function (event) {

  var expected_cache_name_list = Object.keys(CURRENT_CACHE_DICT).map(function(key) {
    return CURRENT_CACHE_DICT[key];
  });

  // claim the scope immediately
  // XXX does not work?
  // self.clients.claim();
  
  event.waitUntil(caches.keys()
    .then(function(cache_name_list) {
      return Promise.all(
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
        })
      );
    })
    .then(function () {
      console.log("[ServiceWorker] Claiming clients for version");
      return self.clients.claim();
    })
  );
});

// XXX I'm a server
// intercept network requests, allows to serve form cache or fetch from network
/*
self.addEventListener('fetch', function (event) {
  
  if (event.request.headers.get('range')) {
    var pos =
    Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get('range'))[1]);
    console.log('Range request for', event.request.url,
      ', starting position:', pos);
    event.respondWith(
      caches.open(CURRENT_CACHES.prefetch)
      .then(function(cache) {
        return cache.match(event.request.url);
      }).then(function(res) {
        if (!res) {
          return fetch(event.request)
          .then(res => {
            return res.arrayBuffer();
          });
        }
        return res.arrayBuffer();
      }).then(function(ab) {
        return new Response(
          ab.slice(pos),
          {
            status: 206,
            statusText: 'Partial Content',
            headers: [
              // ['Content-Type', 'video/webm'],
              ['Content-Range', 'bytes ' + pos + '-' +
                (ab.byteLength - 1) + '/' + ab.byteLength]]
          });
      }));
  } else {
    console.log('Non-range request for', event.request.url);
    event.respondWith(
    // caches.match() will look for a cache entry in all of the caches available to the service worker.
    // It's an alternative to first opening a specific named cache and then matching on that.
    caches.match(event.request).then(function(response) {
      if (response) {
        console.log('Found response in cache:', response);
        return response;
      }
      console.log('No response found in cache. About to fetch from network...');
      // event.request will always have the proper mode set ('cors, 'no-cors', etc.) so we don't
      // have to hardcode 'no-cors' like we do when fetch()ing in the install handler.
      return fetch(event.request).then(function(response) {
        console.log('Response from network is:', response);

        return response;
      }).catch(function(error) {
        // This catch() will handle exceptions thrown from the fetch() operation.
        // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
        // It will return a normal response object that has the appropriate error code set.
        console.error('Fetching failed:', error);

        throw error;
      });
    })
    );
  }

  
  // ========================
  
  var url = event.request.url,
    cacheable_list = [],
    isCacheable = function (el) {
      return url.indexOf(el) >= 0;
    };

  if (event.request.method === "GET") {
    event.respondWith(caches.open(CURRENT_CACHE_DICT["self"])
      .then(function(cache) {
        return cache.match(event.request)
          .then(function(response) {
  
            // cached, return from cache
            if (response) {
              return response;
      
            // not cached, fetch from network
            }

            // clone call, because any operation like fetch/put... will
            // consume the request, so we need a copy of the original
            // (see https://fetch.spec.whatwg.org/#dom-request-clone)
            return fetch(event.request.clone())
              .then(function(response) {
                
                // add resource to cache
                if (response.status < 400 && cacheable_list.some(isCacheable)) {
                  cache.put(event.request, response.clone());
                }
                return response;
              });
            });
      })
      .catch(function(error) {

        // This catch() will handle exceptions that arise from the match()
        // or fetch() operations. Note that a HTTP error response (e.g.
        // 404) will NOT trigger an exception. It will return a normal 
        // response object that has the appropriate error code set.
        throw error;
      })
    );

  // we could also handle post with indexedDB here
  //} else {
  //  event.respondWith(fetch(event.request));
  }
});
*/

self.addEventListener('message', function (event) {
  var param = event.data,
    item,
    mime_type,
    result_list;
  
  switch (param.command) {
    
    // case 'post' not possible
    
    // test if cache exits
    case 'get':
      caches.keys().then(function(key_list) {
        var i, len;
        CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
        for (i = 0, len = key_list.length; i < len; i += 1) {
          if (key_list[i] === CURRENT_CACHE) {
            event.ports[0].postMessage({
              error: null
            });
          }
        }
      
        // event.ports[0] corresponds to the MessagePort that was transferred 
        // as part of the controlled page's call to controller.postMessage(). 
        // Therefore, event.ports[0].postMessage() will trigger the onmessage
        // handler from the controlled page. It's up to you how to structure 
        // the messages that you send back; this is just one example.
        event.ports[0].postMessage({
          error: {
            "status": 404,
            "message": "Cache does not exist."
          }
        });
      })
      .catch(function(error) {
        event.ports[0].postMessage({
          error: {'message': error.toString()}
        });
      });

      break;

    // create new cache by opening it. this will only run once per cache/folder
    case 'put':
      if (param.id === "self") {
        event.port[0].postMessage({
          error: {
            'status': 406,
            'message': "Reserved cache name. Please choose a different name."
          }
        });
      }
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
      CURRENT_CACHE_DICT[param.id] = CURRENT_CACHE;
      caches.open(CURRENT_CACHE)
        .then(function() {
          event.ports[0].postMessage({
            error: null,
            data: param.id
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {'message': error.toString()}
          });
        });
    break;
    
    // remove a cache
    case 'remove':
      delete CURRENT_CACHE_DICT[param.id];
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
      caches.delete(CURRENT_CACHE)
        .then(function() {
          event.ports[0].postMessage({
            error: null
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {'message': error.toString()}
          });
        });
    break;

    // return list of caches ~ folders
    case 'allDocs':
      caches.keys().then(function(key_list) {
        var result_list = [],
          id,
          i;
        for (i = 0; i < key_list.length; i += 1) {
          id = key_list[i].split("-v")[0];
          if (id !== "self") {
            result_list.push({
              "id": id,
              "value": {}
            });
          }
        }
        event.ports[0].postMessage({
          error: null,
          data: result_list
        });
      })
      .catch(function(error) {
        event.ports[0].postMessage({
          error: {'message': error.toString()}
        });
      });
    break;
    
    // return all urls stored in a cache
    case 'allAttachments':
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;

      // returns a list of the URLs corresponding to the Request objects
      // that serve as keys for the current cache. We assume all files
      // are kept in cache, so there will be no network requests.

      caches.open(CURRENT_CACHE)
        .then(function(cache) {
          cache.keys()
          .then(function (request_list) {
            var result_list = request_list.map(function(request) {
              return request.url;
            }),
              attachment_dict = {},
              i, 
              len;
              
            for (i = 0, len = result_list.length; i < len; i += 1) {
              attachment_dict[result_list[i]] = {};
            }
            event.ports[0].postMessage({
              error: null,
              data: attachment_dict
            });
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {'message': error.toString()}
          });
        });
    break;
  
    case 'removeAttachment':
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;

      caches.open(CURRENT_CACHE)
        .then(function(cache) {
          request = new Request(param.name, {mode: 'no-cors'});
          cache.delete(request)
            .then(function(success) {
              event.ports[0].postMessage({
                error: success ? null : {
                  'status': 404,
                  'message': 'Item not found in cache.'
                }
              });
            });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {'message': error.toString()}
          });
        });
    break;

    case 'getAttachment':
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
      caches.open(CURRENT_CACHE)
        .then(function(cache) {
          return cache.match(param.name)
          .then(function(response) {
            var is_range = response.headers.get('range') || param.options.range,
              start,
              end,
              split, blobber;

            mime_type = response.headers.get('Content-Type');

            // range requests
            if (is_range) {
              split = is_range.split("bytes=")[1].split("-");
              start = split[0];
              end = split[1];
              
              return response.arrayBuffer()
                .then(function (array_buffer) {
                  var dataView = new DataView(array_buffer.slice(start, end));
                  return new Blob([dataView], {"type": mime_type});
                });

            } else {
            
            // the response body is a ReadableByteStream which cannot be
            // passed back through postMessage apparently. This link
            // https://jakearchibald.com/2015/thats-so-fetch/ explains
            // what can be done to get a Blob to return
            
            // XXX Improve
            // However, calling blob() does not allow to set mime-type, so
            // currently the blob is created, read, stored as new blob
            // and returned (to be read again)
            // https://github.com/whatwg/streams/blob/master/docs/ReadableByteStream.md
            return response.clone().blob();
            }
          })
          .then(function (response_as_blob) {
            return new Promise(function(resolve) {
              var blob_reader = new FileReader();
              blob_reader.onload = resolve;
              blob_reader.readAsText(response_as_blob);
            });
          })
          // XXX why am I doing this? just to add the mime-type?
          .then(function (reader_response) {
            console.log(reader_response)
            return new Blob([reader_response.target.result], {
              "type": mime_type
            });
          })
          .then(function (converted_response) {
            console.log(converted_response)
            if (converted_response) {
              event.ports[0].postMessage({
                error: null,
                data: converted_response
              });
            } else {
              event.ports[0].postMessage({
                error: {
                  'status': 404,
                  'message': 'Item not found in cache.'
                }
              });
            }
          });
        })
        .catch(function(error) {
          console.log("Hum")
          console.log(error)
          event.ports[0].postMessage({
            error: {'message': error.toString()}
          });
        });
    break;  
      
    case 'putAttachment':
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
      caches.open(CURRENT_CACHE)
        .then(function(cache) {

          // If event.data.url isn't a valid URL, new Request() will throw a 
          // TypeError which will be handled by the outer .catch().
          // Hardcode {mode: 'no-cors} since the default for new Requests 
          // constructed from strings is to require CORS, and we don't have any 
          // way of knowing whether an arbitrary URL that a user entered 
          // supports CORS.
          request = new Request(param.name, {mode: 'no-cors'});
          response = new Response(param.content);
          return cache.put(request, response);
        })
        .then(function() {
          event.ports[0].postMessage({
            error: null
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {'message': error.toString()}
          });
        });
    break;
    
    // refuse all else
    default:
      throw 'Unknown command: ' + event.data.command;
  }
});  



