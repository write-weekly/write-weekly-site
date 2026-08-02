module.exports = function (eleventyConfig) {
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
