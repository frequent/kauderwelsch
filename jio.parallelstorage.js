/**
 * JIO Parallel Storage Type = "Parallel".
 * keep storages in parallel, without sync/replication
 */
/*jslint indent: 2 */
/*global jIO, RSVP, Array*/
(function (jIO, RSVP, Array) {
  "use strict";

  /**
   * The JIO Parallel Storage extension
   *
   * @class ParallelStorage
   * @constructor
   */
  function ParallelStorage (spec) {
    var i;

    if (spec.storage_list !== undefined || !Array.isArray(spec.storage_list)) {
      throw new jIO.util.jIOError("storage_list is not an Array", 400);
    }
    this._storage_list = [];
    for (i = 0; i < spec.storage_list.length; i += 1) {
      this._storage_list.push(jIO.createJIO(spec.storage_list[i]));
    }
  }

  ParallelStorage.prototype.post = function (index, content) {
    var storage = this._storage_list[index];
    return storage.post.call(storage, content);
  };

  ParallelStorage.prototype.put = function (index, id, content) {
    var storage = this._storage_list[index];
    return storage.put.call(storage, id, content);
  };

  ParallelStorage.prototype.get = function (index, id) {
    var storage = this._storage_list[index];
    return storage.get.call(storage, id);
  };

  ParallelStorage.prototype.remove = function (index, id) {
    var storage = this._storage_list[index];
    return storage.remove.call(storage, id);
  };
  
  ParallelStorage.prototype.allDocs = function (index, options) {
    var storage = this._storage_list[index];
    return storage.allDocs.call(storage, options);
  };
  
  ParallelStorage.prototype.allAttachments = function (index, id, options) {
    var storage = this._storage_list[index];
    return storage.allAttachments.call(storage, id, options);
  };

  ParallelStorage.prototype.removeAttachments = function (index, id, name) {
    var storage = this._storage_list[index];
    return storage.removeAttachments.call(storage, id, name);
  };

  ParallelStorage.prototype.putAttachments = function (index, id, name, content) {
    var storage = this._storage_list[index];
    return storage.putAttachments.call(storage, id, name, content);
  };

  ParallelStorage.prototype.getAttachments = function (index, id, name, options) {
    var storage = this._storage_list[index];
    return storage.getAttachments.call(storage, id, name, options);
  };

  jIO.addStorage('parallel', ParallelStorage);

}(jIO, RSVP, Array));

