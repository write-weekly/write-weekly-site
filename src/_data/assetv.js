// Build-time version stamp for cache-busting shared assets (site.css / site.js).
// Evaluated once per build, so a new deploy produces new ?v= URLs and browsers
// fetch the updated files immediately instead of serving a stale cached copy.
module.exports = () => Date.now();
