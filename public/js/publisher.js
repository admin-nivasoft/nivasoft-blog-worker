(function () {
  "use strict";

  // Configure the deployed Cloudflare Worker URL here. Never place GitHub tokens in this file.
  const WORKER_URL = "https://nivasoft-blog-worker.ashwin-b2a.workers.dev/";

  async function publishArticle(slug, markdown) {
    if (!WORKER_URL || WORKER_URL === "https://nivasoft-blog-worker.ashwin-b2a.workers.dev/") {
      throw new Error("Publishing is not configured yet. Add the deployed Cloudflare Worker URL in js/publisher.js.");
    }

    let response;
    try {
      response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, markdown })
      });
    } catch (error) {
      throw new Error("Network error: could not reach the publishing service. Check your connection and Worker URL.");
    }

    let result = {};
    try { result = await response.json(); }
    catch (_) { result = { message: "The publishing service returned an unreadable response." }; }

    if (!response.ok) {
      const message = result.message || result.error || "";
      if (response.status === 409) throw new Error(message || "A file with this slug already exists. Choose a different slug.");
      if (response.status === 400) throw new Error(message || "The publishing service rejected the article data. Check the required fields.");
      if (response.status === 401 || response.status === 403) throw new Error(message || "You are not authorized to publish. Ask the administrator to check your publishing access.");
      if (response.status >= 500) throw new Error(message || `GitHub or the publishing service returned an error (HTTP ${response.status}).`);
      throw new Error(message || `Publishing failed (HTTP ${response.status}).`);
    }

    // A 2xx response alone is not proof of a GitHub commit. Require explicit commit confirmation.
    const committed = result.committed === true || result.success === true && Boolean(result.commitUrl || result.commit || result.sha);
    if (!committed) throw new Error(result.message || "The Worker did not confirm that GitHub created a commit. No success was reported.");
    return result;
  }

  window.NivasoftPublisher = { publishArticle };
})();
