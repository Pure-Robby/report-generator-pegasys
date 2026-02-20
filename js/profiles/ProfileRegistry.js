/**
 * Profile registry. Each profile provides validateAndParseWorkbook and buildSlides
 * for per-theme (per-client) data mapping and slide pipeline.
 */
(function () {
  const profiles = {};

  function register(id, profile) {
    if (!id || !profile) return;
    profiles[id] = profile;
  }

  function getProfile(id) {
    if (!id) return null;
    return profiles[id] || null;
  }

  window.ProfileRegistry = {
    register,
    getProfile
  };
})();
