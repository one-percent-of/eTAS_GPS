app.factory('Records', function () {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var userEmail;
  var items = [];
  var id;

  return {
    all: function () {
      return items;
    },
    remove: function (id) {
      items.splice(items.indexOf(id), 1);
    },
    setEmail: function (email) {
      userEmail = email;
    },
    getEmail: function () {
      return userEmail;
    },
    get: function (recordId) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === parseInt(recordId)) {
          return items[i];
        }
      }
      return null;
    },
    push: function (value) {
      items.push(value);
    },
    setId: function (id_) {
      id = id_;
    },
    getId: function () {
      return id;
    },
    clear: function () {
      items = [];
      userEmail = null;
    }
  };
});

app.factory('RealTime', function () {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var items = {};
  var id;

  return {
    all: function () {
      return items;
    },
    setId: function (id_) {
      id = id_;
    },
    get: function (recordId) {
      return items[recordId];
    },
    getId: function () {
      return id;
    },
    clear: function () {
      items = {};
    },
    update: function (value) {
      items = Object.assign({}, value);
    }
  };
});

app.factory('errorRecords', function () {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var items = [];
  var state = false;

  return {
    all: function () {
      return items;
    },
    setId: function (id_) {
      id = id_;
    },
    get: function (recordId) {
      return items[recordId];
    },
    stateChange: function () {
      if (state) state = false;
      else state = true;
    },
    push: function (value) {
      items.push(value);
    },
    getState: function () {
      return state;
    },
    clear: function () {
      items = [];
    }
  };
});
app.filter('reverse', function () {
  return function (items) {
    // return items.slice().reverse();
    return items;
  };
});
