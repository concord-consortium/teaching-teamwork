module.exports = function() {
  try {
    return window.self !== window.top;
  }
  catch (e) {
    return true;
  }
};
