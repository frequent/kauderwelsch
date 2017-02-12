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
  // XXX harmonize using sharesWorker which requires ports as serviceworker?
  function sendMessage(message) {
    return new RSVP.Promise(function (resolve, reject) {
      spec._processor.onmessage = function (event) {
        if (event.data.error) {
          reject(event.data.error);
        } else {
          resolve(event.data.data);
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
      spec._processor = self.processor;
      spec._handler = spec._processor.process;
    } else {
      spec._processor = new Worker(spec.index_generator);
      spec._handler = sendMessage;
    }
    
    // alternatively I just roll my own indexedb?
    // but how would I differentiate if folders are docs and files are attachments
    // this is not an indxedb issue but a general one
    // why do I store folders anway, I'm not using them. just store the indexed
    // content, then I have to live with ... duplicates, no we don't. this means
    // I somehow need info on allDocs, what file is relevant. I can pass the 
    // language or a pointer with the limit?

    return new RSVP.Queue()
      .push(function () {
        return RSVP.all([
          jIO.createJIO(spec.index_storage),
          jIO.createJIO(spec.sub_storage)
        ]);
      })
      -push(function (storage_list) {
        context._index_storage = storage_list[0];  
        context._sub_storage = storage_list[1];
      });
  }

  // who does?
  IndexStorage.prototype.post = function (content) {
    throw new jIO.util.jIOError("Index Storage does not support post", 400);  
  };

  IndexStorage.prototype.put = function (id, content) {
    var storage = this._sub_storage;
    return storage.put.call(storage, id, content);
  };

  IndexStorage.prototype.get = function (id) {
    var storage = this._sub_storage;
    return storage.get.call(storage, id);
  };

  IndexStorage.prototype.remove = function (id) {
    var storage = this._sub_storage;
    return storage.remove.call(storage, id);
  };

  // XXX this is not really a good way, because we can't index attachment-content
  // and store it inside an attachment. Find more elegant way... and I don't 
  // know the file id, prefix
  IndexStorage.prototype.allDocs = function (options) {
    var opts = options || {},
      storage = this._sub_storage,
      index = this._index_storage;
    
    // we expect the processor setting correct ids for put and the limit
    // also containing correct ids! the storage is dumb!
    if (opts.limit !== undefined) {
      return index.allDocs.call(index, opts);
    }
    return storage.allDocs.call(storage, opts);
  };
  
  IndexStorage.prototype.allAttachments = function (id, options) {
    var storage = this._sub_storage;
    return storage.allAttachments.call(storage, id, options);
  };

  // fetching a large file goes against indexing it and serving ranges
  IndexStorage.prototype.getAttachments = function (id, name, options) {
    var storage = this._sub_storage;
    return storage.getAttachment.apply(storage, id, name, options);
  };

  // remove file and udpate index (in most inefficient way)
  IndexStorage.prototype.removeAttachments = function (id, name) {
    var storage = this._sub_storage,
      index = this._index_storage;
    return new RSVP.Queue()
      .push(function () {

        // XXX add prefix support https://gist.github.com/inexorabletash/5462871
        RSVP.all([
          index.allDocs(),
          storage.removeAttachment.apply(storage, id, name)
        ]);
      })
      .push(function (result_list) {
        var garbage_list = [],
          data = result_list[0].data,
          key;
        for (i = 0; i < data.total_rows; i += 1) {
          key = data.rows[i];
          if (key.indexOf(name) > -1) {
            garbage_list.push(index.remove(key));
          }
        }
        return RSVP.all(garbage_list);
      });
  };

  // store file as attachment and add indices (prefixed by cache)
  IndexStorage.prototype.putAttachments = function (id, name, blob) {
    var handler = this._handler,
      storage = this._sub_storage,
      index = this._index_storage;

    return new RSPV.Queue()
    .push(function () {
      return RSVP.all([
        handler(name, blob),
        storage.put.apply(id, name, blob)
      ]);
    })
    .push(function (result_list) {
      var index_entry_list = [], 
        data = result_list[0].data,
        i;
      for (i = 0; i < data.total_rows; i += 1) {
        index_entry_list.push(index.put.apply(index, data.rows[i]));
      }
      return RSVP.all(index_entry_list);
    });
  };

  jIO.addStorage('index', IndexStorage);

}(self, jIO, RSVP, Array));

