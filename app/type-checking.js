function either (...possibilities) {
  const checker = (result) => {
    return possibilities.find(possibility => possibility === result) !== undefined;
  };

  checker.toString = () => {
    return `either(${possibilities.join(', ')})`;
  };

  return checker;
}

function toString (possibilities) {
  if (typeof possibilities === 'function') {
    return possibilities.toString();
  } else {
    return possibilities;
  }
}

function checker (expectedReturnType, result) {
  if (typeof expectedReturnType === 'function') {
    return expectedReturnType(result);
  } else {
    return typeof expectedReturnType === typeof result;
  }
}

function checkReturnType (name, options, f) {
  return function () {
    const result = f.apply(this, arguments);

    if (!checker(options.returns, result)) {
      throw new TypeError(`${name} returned '${result}' (${typeof result}). Expected return type: ${toString(options.returns)}`);
    };

    return result;
  };
}

module.exports = {either, checkReturnType};
