(function () {
  "use strict";

  const ALLOWED_CATEGORIES = ["Enterprise AI", "GCC", "Security", "Talent", "Salesforce"];

  // JSON string syntax is a valid, safely escaped YAML double-quoted scalar.
  function yamlString(value) {
    return JSON.stringify(String(value));
  }

  function parseTags(raw) {
    return String(raw || "").split(",").map(tag => tag.trim()).filter(Boolean);
  }

  function generateMarkdown(article) {
    const lines = [
      "---",
      `title: ${yamlString(article.title)}`,
      `description: ${yamlString(article.description)}`,
      `date: ${yamlString(article.date)}`,
      `category: ${yamlString(article.category)}`
    ];

    const tags = parseTags(article.tags);
    if (tags.length) lines.push(`tags: [${tags.map(yamlString).join(", ")}]`);
    if (article.linkedin.trim()) lines.push(`linkedin: ${yamlString(article.linkedin.trim())}`);
    if (article.statValue.trim()) lines.push(`statValue: ${yamlString(article.statValue.trim())}`);
    if (article.statLabel.trim()) lines.push(`statLabel: ${yamlString(article.statLabel.trim())}`);
    if (article.featured) lines.push("featured: true");
    if (article.draft) lines.push("draft: true");

    return `${lines.join("\n")}\n---\n\n${String(article.body || "").replace(/\s+$/, "")}\n`;
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  function validateArticle(article) {
    const errors = {};
    if (!article.title.trim()) errors.title = "Enter an article title.";
    if (!article.slug.trim()) errors.slug = "Enter a URL slug.";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) errors.slug = "Use lowercase letters, numbers and single hyphens only.";
    if (!article.description.trim()) errors.description = "Enter an SEO description.";
    if (!article.date || !/^\d{4}-\d{2}-\d{2}$/.test(article.date) || !isRealDate(article.date)) errors.date = "Enter a valid date in YYYY-MM-DD format.";
    if (!ALLOWED_CATEGORIES.includes(article.category)) errors.category = "Select one of the available categories.";
    if (article.linkedin.trim()) {
      try {
        const url = new URL(article.linkedin.trim());
        if (url.protocol !== "https:") throw new Error("HTTPS required");
      } catch (_) {
        errors.linkedin = "Enter a valid HTTPS URL.";
      }
    }
    if (!article.body.trim()) errors.body = "Add the article body before continuing.";
    return errors;
  }

  function isRealDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  window.NivasoftMarkdown = { generateMarkdown, slugify, validateArticle, parseTags, ALLOWED_CATEGORIES };
})();
