Map.prototype.map = function (f) {
  const resultingMap = new Map();

  this.forEach((value, key) => {
    resultingMap.set(key, f(value, key));
  });

  return resultingMap;
};

Map.prototype.filter = function (f) {
  const resultingMap = new Map();

  this.forEach((value, key) => {
    if (f(value, key)) {
      resultingMap.set(key, value);
    };
  });

  return resultingMap;
};

Map.prototype.valuesArray = function () {
  const values = [];

  for (let value of this.values()) {
    values.push(value);
  }

  return values;
};

Map.prototype.keysArray = function () {
  const keys = [];

  for (let key of this.keys()) {
    keys.push(key);
  }

  return keys;
};

Map.prototype.log = function () {
  const entries = {};

  for (let [key, value] of this.entries()) {
    entries[key] = value;
  };

  console.log(entries);

  return this;
};
