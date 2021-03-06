/**
 * JIO Cache Storage Type = "Cache".
 * stores objects (blobs) using their url in caches (documents)
 */

/*jslint indent: 2 */
/*jIO, RSVP, Blob, Request, Response*/
(function (jIO, RSVP, Blob, Request, Response) {
  "use strict";

  /*
  // DEBUG
  // list all caches and content of first
  caches.keys()
  .then(function(key_list) {
    console.log(key_list);
    return caches.open(key_list[0]);
  })
  .then(function(cache) {
    return cache.keys();
  })
  .then(function(request_list) {
    console.log(request_list);
  });

  // clear last cache
  caches.keys()
  .then(function(key_list) {
    console.log(key_list);
    return caches.open(key_list[0]);
  })
  .then(function(cache) {
    return cache.keys();
  })
  .then(function(request_list) {
    console.log(request_list); 
    return cache.delete(request_list[0]);
  });
  */

  // no need to validate attachment name, because cache will throw non-urls
  function restrictDocumentId(id) {
    if (id.indexOf("/") > -1) {
      throw new jIO.util.jIOError("id should be a project name, not a path)",
                                  400);
    }
    return id;
  }

  /**
   * The JIO Cache Storage extension
   *
   * @class CacheStorage
   * @constructor
   */
  function CacheStorage (spec) {
    if (!spec.version) {
      throw new jIO.util.jIOError("CacheStorage requires version.", 503);
    }
    this._getCacheName = function (id) {
      return id + "-v" + spec.version;
    };
  }

  // no post
  CacheStorage.prototype.post = function () {
    throw new jIO.util.jIOError("Storage requires 'put' to create new cache",
                                400);
  };

  // create new cache by opening it. this will only run once per cache/folder
  CacheStorage.prototype.put = function (id, content) {
    var cache_name = this._getCacheName(restrictDocumentId(id));
    if (content) {
      throw new jIO.util.jIOError(
        "Storage 'put' creates a folder/cache. Use putAttachment to add content",
        400
      );
    }                            
    return new RSVP.Promise(function (resolve, reject) {
      // XXX keep reserved as internal cache?
      if (id === "self") {
        throw new jIO.util.jIOError("Reserved cache name " + id, 406);
      }

      // XXX not accessible from here - how to maintain/update caches
      // CURRENT_CACHE_DICT[id] = current_cache;
      return new RSVP.Queue()
        .push(function () {
          return caches.open(cache_name);    
        })
        .push(function () {
          return resolve(id);
        })
        .push(undefined, function (error) {
          return reject(error);
        });
    });
  };

  CacheStorage.prototype.get = function (id) {
    var cache_name = this._getCacheName(restrictDocumentId(id));
    return new RSVP.Promise(function (resolve, reject) {
      return new RSVP.Queue()
        .push(function () {
          return caches.keys();
        })
        .push(function(key_list) {
          var len,
            i;
          for (i = 0, len = key_list.length; i < len; i += 1) {
            if (key_list[i] === cache_name) {
              return resolve();
            }
          }
          throw new jIO.util.jIOError("Cannot find cache  " + id, 404);
        })
        .push(undefined, function (error) {
          return reject(error);
        });
    });
  };

  // remove a cache
  CacheStorage.prototype.remove = function (id) {
    var cache_name = this._getCacheName(restrictDocumentId(id));
    return new RSVP.Promise(function (resolve, reject) { 
      return new RSVP.Queue()
        .push(function () {
          // XXX can't access from here
          // delete CURRENT_CACHE_DICT[param.id];
          return caches.delete(cache_name);
        })
        .push(function(success) {
          // XXX not sure caches.delete returns true like cache.delete!
          if (success) {
            return resolve();
          }
          throw new jIO.util.jIOError(
            "Cannot find attachment: " + id + " , " + name,
            404
          );
        })
        .push(undefined, function (error) {
          return reject(error);
        });
    });
  };

  CacheStorage.prototype.hasCapacity = function (name) {
    // XXX hm, differentiate between index_storage and substorage?
    return (name === "list");
  };

  // return list of caches ~ folders
  CacheStorage.prototype.allDocs = function (options) {
    var context = this;
    return new RSVP.Promise(function (resolve, reject) {
      return new RSVP.Queue()
        .push(function () {
          return context.buildQuery.apply(this, options);
        })
        .push(undefined, function (error) {
          return reject(error);
        });
    });
  };
    
  CacheStorage.prototype.buildQuery = function (options) {
    return new RSVP.Promise(function (resolve, reject) { 
      return new RSVP.Queue()
        .push(function () {
          return caches.keys();
        })
        .push(function (key_list) {
        var result_list = [],
          id,
          i;
  
        for (i = 0; i < key_list.length; i += 1) {
          id = key_list[i].split("-v")[0];
          if (id !== "self") {
            result_list.push({"id": id, "value": {}});
          }
        }
        return resolve(result_list);
      })
      .push(undefined, function (error) {
        return reject(error);
      });
    });  
  };
  
  // return all urls stored in a cache
  CacheStorage.prototype.allAttachments = function (id, options) {
    var cache_name = this._getCacheName(restrictDocumentId(id));
    return new RSVP.Promise(function (resolve, reject) { 
      // returns a list of the URLs corresponding to the Request objects
      // that serve as keys for the current cache. We assume all files
      // are kept in cache, so there will be no network requests.
      return new RSVP.Queue()
        .push(function () {
          return caches.open(cache_name);
        })
        .push(function(cache) {
          return cache.keys();
        })
        .push(function (request_list) {
          var result_list = request_list.map(function(request) {
            return request.url;
          }),
            attachment_dict = {},
            i, 
            len;
            
          for (i = 0, len = result_list.length; i < len; i += 1) {
            attachment_dict[result_list[i]] = {};
          }
          return resolve(attachment_dict);
        })
        .push(undefined, function (error) {
          return reject(error);
        });
    });
  };

  // delete a file from a cache
  CacheStorage.prototype.removeAttachment = function (id, name) {
    var cache_name = this._getCacheName(restrictDocumentId(id));
    return new RSVP.Promise(function (resolve, reject) { 
      return new RSVP.Queue()
        .push(function () {
          return caches.open(cache_name);
        })
        .push(function(cache) {
          var request = new Request(name, {mode: 'no-cors'});
          return cache.delete(request);
        })
        .push(function (success) {
          if (success) {
            return resolve();
          }
          throw new jIO.util.jIOError(
            "Cannot find attachment: " + id + " , " + name,
            404
          );
        });
      })
      .push(undefined, function (error) {
        return reject(error);
      });
  };

  // add a file to a cache
  CacheStorage.prototype.putAttachment = function (id, name, blob) {
    var cache_name = this._getCacheName(restrictDocumentId(id));
    return new RSVP.Promise(function (resolve, reject) {
      return new RSVP.Queue()
        .push(function () {
          return caches.open(cache_name);
        })
        .push(function(cache) {
          var request = new Request(name, {mode: 'no-cors'}),
            response = new Response(blob);

          // If name = attachment url => event.data.url is not a 
          // valid URL, new Request() will throw a TypeError which will be 
          // handled by the outer .catch().
          // Hardcode {mode: 'no-cors} since the default for new Requests 
          // constructed from strings is to require CORS, and we don't have any 
          // way of knowing whether an arbitrary URL that a user entered 
          // supports CORS.
          return cache.put(request, response);
        })
        .push(function() {
          return resolve();
        })
        .push(undefined, function (error) {
          return reject(error);
        });
    });
  };
  
  // get a file from cache
  CacheStorage.prototype.getAttachment = function (id, name, options) {
    var cache_name = this._getCacheName(restrictDocumentId(id));
    return new RSVP.Promise(function (resolve, reject) {
      return new RSVP.Queue()
        .push(function () {
          return caches.open(cache_name);
        })
        .push(function (cache) {
          var mime_type;

          return new RSVP.Queue()
            .push(function () {
              return cache.match(name);
            })
            .push(function (response) {
              var is_range,
                start,
                end, 
                split;

              if (response === undefined) {
                return;
              }

              is_range = response.headers.get('range') || options.range;
              mime_type = response.headers.get('Content-Type');

              if (!is_range) {
                
                // the response body is a ReadableByteStream which cannot be
                // passed back through postMessage apparently. This link
                // https://jakearchibald.com/2015/thats-so-fetch/ explains
                // what can be done to get a Blob to return
  
                // However, calling blob() does not allow to set mime-type, so
                // currently the blob is created, read, stored as new blob
                // and returned (to be read again)
                // https://github.com/whatwg/streams/blob/master/docs/ReadableByteStream.md
                
                // XXX why am I doing this? just to add the mime-type?
                return new RSVP.Queue()
                  .push(function () {
                    return response.clone().blob();
                  })
                  .push(function (response_as_blob) {
                    return new RSVP.Promise(function(resolve) {
                      var blob_reader = new FileReader();
                      blob_reader.onload = resolve;
                      blob_reader.readAsText(response_as_blob);
                    });
                  })
                  .push(function (reader_response) {
                    return new Blob([reader_response.target.result], {"type": mime_type});
                  });
              }
              return new RSVP.Queue()
                .push(function () {
                  return response.arrayBuffer();
                })
                .push(function (array_buffer) {
                  var split = is_range.split("bytes=")[1].split("-"),
                    start = split[0],
                    end = split[1] || array_buffer.byteLength,
                    dataView = new DataView(array_buffer.slice(start, end));
                  return new Blob([dataView], {"type": mime_type});
                });
            });
        })
        .push(function (converted_blob) {
          if (converted_blob) {
            return resolve(converted_blob);
          }
          throw new jIO.util.jIOError(
            "Cannot find attachment: " + id + " , " + name,
            404
          );
        })
        .push(undefined, function (error) {
          return reject(error);
        });
    });
  };

  jIO.addStorage('cache', CacheStorage);

}(jIO, RSVP, Blob, Request, Response));

