/**
 * JIO Worker Storage Type = "Worker".
 * connects to a substorage inside a worker/serviceworker.
 */
/*jslint indent: 2 */
/*global global, Blob, jIO, RSVP, navigator*/
(function (global, jIO, RSVP, Blob, navigator) {
  "use strict";

  function serializeUrlList(url_list) {
    var prefix = "prefetch_url_list=",
      url_param = "";
    if (url_list) {
      url_param = url_list.reduce(function (current, next) {
        return current + prefix + encodeURIComponent(next) + "&";
      }, url_param);
    }
    return url_param.substring(0, url_param.length - 1);
  }

  // no need to validate attachment name, because serviceworker.js will throw
  function restrictDocumentId(id) {
    if (id.indexOf("/") > -1) {
      throw new jIO.util.jIOError("id should be a project name, not a path)",
                                  400);
    }
    return id;
  }

  // This wraps the message posting/response in a promise, which will resolve if
  // the response doesn't contain an error, and reject with the error if it does.
  // Alternatively, onmessage handle and controller.postMessage() could be used
  function sendMessage(message) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      var messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = function (event) {
        if (event.data.error) {
          reject(event.data.error);
        } else {
          resolve(event.data.data);
        }
      };

      // This sends the message data as well as transferring
      // messageChannel.port2 to the service worker. The service worker can then
      // use the transferred port to reply via postMessage(), which will in turn
      // trigger the onmessage handler on messageChannel.port1.
      // See https://html.spec.whatwg.org/multipage/workers.html
      return navigator.serviceWorker.controller
        .postMessage(message, [messageChannel.port2]);
    });
  }
  
  function installWorker(spec) {
    return new RSVP.Queue()
      .push(function () {
        return spec.sw.getRegistration();
      })
      .push(function (registered_worker) {
        if (!registered_worker) {
          return spec.sw.register(spec.url, {"scope": spec.scope});   
        }

        // XXX What if this isn't mine?
        return registered_worker;
      });
  }

  function waitForInstallation(registration) {
    return new RSVP.Promise(function (resolve, reject) {
      if (registration.installing) {
        
        // If the current registration represents the "installing" service
        // worker, then wait until the installation step completes (during
        // which any defined resources are pre-fetched) to continue.
        registration.installing.addEventListener('statechange', function(e) {
          if (e.target.state == 'installed') {
            resolve(registration);
          } else if (e.target.state == 'redundant') {
            reject(e);
          }
        });
      } else {

        // Otherwise, if this isn't the "installing" service worker, then
        // installation must have beencompleted during a previous visit to this
        // page, and the any resources will already have benn pre-fetched So
        // we can proceed right away.
        resolve(registration);
      }
    });
  }

  function claimScope(registration) {
    
    // refreshing should not be necessary if scope is claimed on activate
    // XXX something is not in async - install does not wait for prefetching
    return;
    
    //return new RSVP.Promise(function (resolve, reject) {
    //  if (registration.active && registration.active.state === 'activated') {
    //    resolve();
    //  } else {
    //    reject(new Error("Please refresh to initialize serviceworker."));
    //  }
    //});
  }

  /**
   * The JIO WorkerStorage Storage extension
   *
   * @class WorkerStorage
   * @constructor
   */
  function WorkerStorage (spec) {
    if (spec.type === "serviceWorker" && spec.type in navigator === false) {
      throw new jIO.util.jIOError("Serviceworker not available.",
                                  503);
    }
    if (spec.type === "Worker" && spec.type in global === false) {
      throw new jIO.util.jIOError("WebWorker not available.",
                                  503);
    }
    if (!spec.sub_storage) {
      throw new jIO.util.jIOError("Worker storage requires a sub_storage.",
                                  400);
    }
    if (!spec.url) {
      throw new jIO.util.jIOError("Worker storage requires a url.",
                                  400);
    }

    spec.scope = spec.scope || "./";
    spec.url = spec += "?" + serializeUrlList(spec.prefetch_url_list) + "&" +
      encodeURIComponent(JSON.stringify(spec.sub_storage));
    
    if (spec.type === "serviceWorker") {
      spec.sw = navigator.serviceWorker;
      return new RSVP.Queue()
    -   push(function () {
          // XXX PromiseEventListener(navigator.serviceWorker, "controllerchange", false, console)
          return installServiceWorker(spec);
        })
        .push(function (registration) {
          return waitForInstallation(registration);
        })
        .push(function (installation) {
          return claimScope(installation);
        });
    }

    if (spec.type === "Worker") {
      return new RSVP.Queue()
        .push(function () {
          return new Worker(spec.url);
        })
        .push(function (worker) {
          // what happens here?
        });
    }
  }

  WorkerStorage.prototype.post = function () {
    throw new jIO.util.jIOError("Storage requires 'put' to create new cache",
                                400);
  };

  WorkerStorage.prototype.get = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return sendMessage({
          command: 'get',
          id: restrictDocumentId(id)
        });
      })
      .push(undefined, function (error) {
        if (error.status === 404) {
          throw new jIO.util.jIOError(error.message, 404);
        }
        throw error;
      });
  };

  WorkerStorage.prototype.put = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return sendMessage({
          command: 'get',
          id: restrictDocumentId(id)
        });
      })
      .push(undefined, function (error) {
        if (error.status === 404) {
          return new RSVP.Queue()
            .push(function () {
              return sendMessage({
                command: 'put',
                id: id
              });
            });
          }
          throw error;
      });
  };

  WorkerStorage.prototype.remove = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return sendMessage({
          command: 'allAttachments',
          id: restrictDocumentId(id)
        });
      })
      .push(function (attachment_dict) {
        var url_list = [],
          url;
        for (url in attachment_dict) {
          if (attachment_dict.hasOwnProperty(url)) {
            url_list.append(sendMessage({
              command: 'removeAttachment',
              id: url
            }));
          }
        }
        return RSVP.all(url_list);
      })
      .push(function () {
        return sendMessage({
          command: 'remove',
          id: restrictDocumentId(id)
        });
      });
  };
  
  WorkerStorage.prototype.removeAttachment = function (id, url) {
    return new RSVP.Queue()
      .push(function () {
        return sendMessage({
          command: 'removeAttachment',
          id: restrictDocumentId(id),
          name: url
        });
      });
  };
  
  WorkerStorage.prototype.getAttachment = function (id, url, options) {

    // NOTE: in serviceworker, alternatively get could also be run via
    // an ajax request, which the serviceworker would catch wth fetch listener!
    // for a filesystem equivalent however, we don't assume fetching resources
    // from the network, so all methods will go through sendMessage

    return new RSVP.Queue()
      .push(function () {
        return sendMessage({
          command: 'getAttachment',
          id: restrictDocumentId(id),
          name: url,
          options: options || {}
        });
      })
      .push(function (my_blob_response) {
        return my_blob_response;
      });
  };
  
  WorkerStorage.prototype.putAttachment = function (id, name, param) {
    return new RSVP.Queue()
      .push(function () {
        return sendMessage({
          command: 'putAttachment',
          id: id,
          name: name,
          content: param
        });
      });
  };
  
  WorkerStorage.prototype.allAttachments = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return sendMessage({
          command: 'allAttachments',
          id: restrictDocumentId(id)
        });
      });
  };

  WorkerStorage.prototype.hasCapacity = function (name) {
    return (name === "list");
  };

  // returns a list of all caches ~ folders
  WorkerStorage.prototype.allDocs = function (options) {
    var context = this;

    if (options === undefined) {
      options = {};
    }

    return new RSVP.Queue()
      .push(function () {
        if (context.hasCapacity("list")) {
          return context.buildQuery(options);
        }
      })
      .push(function (result) {
        return result;
      });
  };

  WorkerStorage.prototype.buildQuery = function (options) {
    return new RSVP.Queue()
      .push(function () {
        return sendMessage({
          command: 'allDocs',
          options: options
        });
      });
  };

  jIO.addStorage('worker', WorkerStorage);

}(window || self, jIO, RSVP, Blob, navigator));
