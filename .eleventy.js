module.exports = function (eleventyConfig) {
  // Start every build from an empty dist/. Eleventy never deletes old output,
  // and Netlify can reuse the previous build's folder — a deleted page would
  // otherwise linger and block the redirect that replaces it.
  // (Full builds only — not while `npm start` is watching.)
  eleventyConfig.on("eleventy.before", function ({ runMode }) {
    if (runMode === "build") require("fs").rmSync("dist", { recursive: true, force: true });
  });

  // Copy these through to the built site untouched.
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/img": "img" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });

  // Rebuild the browser preview when CSS or JS changes.
  eleventyConfig.addWatchTarget("src/css/");
  eleventyConfig.addWatchTarget("src/js/");
  eleventyConfig.addWatchTarget("src/_includes/css/");

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data"
    },
    // Treat .html files as Nunjucks templates so layouts and includes work.
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
