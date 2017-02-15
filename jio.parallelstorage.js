/**
 * JIO Parallel Storage Type = "Parallel".
 * keep storages in parallel, without sync/replication
 */
/*jslint indent: 2 */
/*global jIO, RSVP, Array, Number*/
(function (jIO, RSVP, Array, Number) {
  "use strict";

  function testInteger(candidate) {
    if (Number.isInteger(candidate)) {
      return candidate;
    }
  }
  
  function handleArguments(argument_list) {
    if (testInteger(argument_list[0])) {
      return argument_list.splice(1);
    }
    return argument_list;
  }
  
  /**
   * The JIO Parallel Storage extension
   *
   * @class ParallelStorage
   * @constructor
   */
  function ParallelStorage (spec) {
    var i;
    
    if (spec.storage_list === undefined || !Array.isArray(spec.storage_list)) {
      throw new jIO.util.jIOError("storage_list is not an Array", 400);
    }

    this._storage_list = [];
    this._getStorage = function (index) {
      return this._storage_list[testInteger(index) || 0];
    };

    for (i = 0; i < spec.storage_list.length; i += 1) {
      this._storage_list.push(jIO.createJIO(spec.storage_list[i]));
    }
  }

  ParallelStorage.prototype.post = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.post.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.put = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.put.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.get = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.get.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.remove = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.remove.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.allAttachments = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.allAttachments.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.removeAttachment = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.removeAttachment.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.putAttachment = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.putAttachment.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.getAttachment = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.getAttachment.apply(storage, handleArguments(arguments));
  };
  
  ParallelStorage.prototype.hasCapacity = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.hasCapacity.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.allDocs = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.allDocs.apply(storage, handleArguments(arguments));
  };

  ParallelStorage.prototype.buildQuery = function () {
    var storage = this._getStorage(arguments[0]);
    return storage.buildQuery.apply(storage, handleArguments(arguments));
  };

  jIO.addStorage('parallel', ParallelStorage);

}(jIO, RSVP, Array, Number));
