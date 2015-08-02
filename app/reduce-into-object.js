function reduceIntoObject (keyValues) {
  return keyValues.reduce(
    (object, keyValue) => Object.assign(object, keyValue),
    {}
  );
};


module.exports = reduceIntoObject;
