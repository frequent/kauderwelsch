/**
 * JIO Index Storage Type = "Index".
 * Creates an index in a sub_storage using a worker-processor
 */
/*jslint indent: 2 */
/*global jIO, RSVP, Array*/
(function (self, jIO, RSVP, Array) {
  "use strict";

  // This wraps the message posting/response in a promise, which will resolve if
  // the response doesn't contain an error, and reject with the error if it does.
  // XXX harmonize using sharedWorker which requires ports for messaging?
  function sendMessage(message) {
    return new RSVP.Promise(function (resolve, reject) {
      spec._processor.onmessage = function (event) {
        if (event.data.error) {
          return reject(event.data.error);
        } else {
          return resolve(event.data.data);
        }
      };
      return spec._processor.postMessage(message);
    });
  }

  /**
   * The JIO Index Storage extension
   *
   * @class IndexStorage
   * @constructor
   */
  function IndexStorage (spec) {
    var context = this;

    if (!spec.sub_storage) {
      throw new jIO.util.jIOError(
        "Index storage requires a sub_storage.",
        400
      );
    }
    if (!spec.index_generator) {
      throw new jIO.util.jIOError(
        "Index storage requires a generator script.", 
        400
      );
    }
    if (!spec.index_storage) {
      throw new jIO.util.jIOError(
        "Index storage requires index_storage to keep indices.", 
        400
      );
    }

    if (typeof importScripts === 'function') {
      importScripts(spec.index_generator);
      this._processor = self.processor;
      this._handler = this._processor.process;
    } else {
      this._processor = new Worker(spec.index_generator);
      this._handler = sendMessage;
    }

    context._index_storage = jIO.createJIO(spec.index_storage);
    context._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  IndexStorage.prototype.post = function (content) {
    throw new jIO.util.jIOError("Index Storage does not support post", 400);  
  };

  IndexStorage.prototype.put = function (id, content) {
    var storage = this._sub_storage;
    return storage.put.apply(storage, [id, content]);
  };

  IndexStorage.prototype.get = function (id) {
    var storage = this._sub_storage;
    return storage.get.apply(storage, [id]);
  };

  IndexStorage.prototype.remove = function (id) {
    var storage = this._sub_storage;
    return storage.remove.apply(storage, [id]);
  };

  IndexStorage.prototype.allDocs = function (options) {
    var storage = this._sub_storage;
    return storage.allDocs.apply(storage, [opts]);
  };
  
  IndexStorage.prototype.allAttachments = function (id, options) {
    var storage = this._sub_storage;
    return storage.allAttachments.apply(storage, [id, options]);
  };
  
  IndexStorage.prototype.hasCapacity = function (name) {
    // XXX hm, differentiate between index_storage and substorage?
    return (
      (name === "list") ||
      (name === "query") ||
      (name === "limit") ||
      (name === "include")
    );
  };
  
  // XXX this is not optimal, because indexing multiple files will have all
  // indices be mixed up in the [metadata] store. Would be better if multiple
  // stores were possible ~ roll a different inedxeddb storage than the default
  IndexStorage.prototype.buildQuery = function (options) {
    var opts = options || {},
      storage = this._sub_storage,
      index_storage = this._index_storage;

    // index is dumb = we expect the processor setting correct orefix and limit
    // also containing correct prefix along with ids to lookup
    if (opts.limit !== undefined) {
      return index_storage.buildQuery.apply(index_storage, [opts]);
    }
    return storage.buildQuery.apply(storage, [opts]);
  };

  // fetching a large file goes against indexing it and serving ranges
  // the idea is to call allDocs with limit [indexFrom, indexTo] and then only
  // request the ranges returned
  IndexStorage.prototype.getAttachment = function (id, name, options) {
    var storage = this._sub_storage;
    return storage.getAttachment.apply(storage, [id, name, options]);
  };

  // XXX not so nice
  IndexStorage.prototype.removeAttachment = function (id, name) {
    var storage = this._sub_storage,
      index_storage = this._index_storage;
    return new RSVP.Queue()
      .push(function () {

        // XXX add prefix support https://gist.github.com/inexorabletash/5462871
        RSVP.all([
          index_storage.allDocs(),
          storage.removeAttachment.apply(storage, [id, name])
        ]);
      })
      .push(function (result_list) {
        var garbage_list = [],
          data = result_list[0].data,
          key;
        for (i = 0; i < data.total_rows; i += 1) {
          key = data.rows[i];

          // XXX would be better to filter by id, not name
          if (key.indexOf(name) > -1) {
            garbage_list.push(index_storage.remove.apply(index_storage, [key]));
          }
        }
        return RSVP.all(garbage_list);
      });
  };

  // store file as attachment and add indices (prefixed by cache)
  IndexStorage.prototype.putAttachment = function (id, name, blob) {
    var handler = this._handler,
      storage = this._sub_storage,
      index_storage = this._index_storage;
    return new RSVP.Queue()
      .push(function () {
        return handler(name, blob);
      })
      .push(function (result) {
        var index_entry_list = [], 
          data = result.data,
          row,
          i;
        for (i = 0; i < data.total_rows; i += 1) {
          row = data.rows[i];
          index_entry_list.push(
            index_storage.put.apply(index_storage, [row[0], {"block": row[1]}])
          );
        }
        return RSVP.all(index_entry_list);
      })
      .push(function () {
        return storage.putAttachment.apply(storage, [id, name, blob]);
      })
      .push(undefined, function (error) {
        console.log(error);
        throw error;
      });
  };

  jIO.addStorage('index', IndexStorage);

}(self, jIO, RSVP, Array));
