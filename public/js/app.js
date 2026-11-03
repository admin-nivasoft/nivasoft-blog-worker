(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const form = $("articleForm");
  const titleInput = $("title");
  const slugInput = $("slug");
  const dialog = $("confirmDialog");
  let slugManuallyEdited = false;
  let pendingMarkdown = "";

  $("date").value = new Date().toISOString().slice(0, 10);
  $("year").textContent = new Date().getFullYear();

  function getArticle() {
    return {
      title: $("title").value,
      slug: $("slug").value,
      description: $("description").value,
      date: $("date").value,
      category: $("category").value,
      tags: $("tags").value,
      linkedin: $("linkedin").value,
      statValue: $("statValue").value,
      statLabel: $("statLabel").value,
      featured: $("featured").checked,
      draft: $("draft").checked,
      body: $("body").value
    };
  }

  function setError(field, message) {
    const node = $(`${field}Error`);
    if (node) node.textContent = message || "";
    const input = $(field);
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validate(showErrors) {
    const errors = NivasoftMarkdown.validateArticle(getArticle());
    if (showErrors) {
      ["title", "slug", "description", "date", "category", "linkedin", "body"].forEach(field => setError(field, errors[field]));
    }
    return errors;
  }

  function updatePreview() {
    const article = getArticle();
    const markdown = NivasoftMarkdown.generateMarkdown(article);
    $("markdownPreview").textContent = markdown;
    $("filename").textContent = `content/blog/${article.slug || "your-article"}.md`;
    $("previewStatus").textContent = article.body.trim() ? "Preview updated" : "Waiting for content";
    $("descriptionCount").textContent = `${article.description.length} / 320`;

    const words = article.body.trim() ? article.body.trim().split(/\s+/).length : 0;
    $("wordCount").textContent = `${words} ${words === 1 ? "word" : "words"}`;
    $("readingTime").textContent = `${Math.max(1, Math.ceil(words / 200))} min read`;
    pendingMarkdown = markdown;
  }

  titleInput.addEventListener("input", () => {
    if (!slugManuallyEdited) slugInput.value = NivasoftMarkdown.slugify(titleInput.value);
    updatePreview();
  });
  slugInput.addEventListener("input", () => { slugManuallyEdited = true; updatePreview(); });
  form.addEventListener("input", updatePreview);
  form.addEventListener("change", updatePreview);

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      showResult(successMessage, "success");
    } catch (_) {
      showResult("Clipboard access was blocked by your browser. Select and copy the preview manually.", "error");
    }
  }

  function showResult(message, type, link) {
    const box = $("resultMessage");
    box.hidden = false;
    box.className = `result-message ${type}`;
    box.replaceChildren(document.createTextNode(message));
    if (link) {
      box.appendChild(document.createTextNode(" "));
      const anchor = document.createElement("a");
      anchor.href = link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = "View GitHub commit";
      box.appendChild(anchor);
    }
  }

  $("copyMarkdown").addEventListener("click", () => copyText(pendingMarkdown, "Markdown copied to clipboard."));
  $("copyPath").addEventListener("click", () => copyText($("filename").textContent, "Filename copied."));
  $("downloadMarkdown").addEventListener("click", () => {
    const article = getArticle();
    const blob = new Blob([pendingMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${article.slug || "article"}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showResult("Markdown file downloaded.", "success");
  });

  $("publishButton").addEventListener("click", () => {
    const errors = validate(true);
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      $(first).focus();
      showResult("Please fix the highlighted fields before publishing.", "error");
      return;
    }
    const article = getArticle();
    $("confirmTitle").textContent = article.title;
    $("confirmFilename").textContent = `content/blog/${article.slug}.md`;
    dialog.showModal();
  });

  $("confirmPublish").addEventListener("click", async event => {
    event.preventDefault();
    const errors = validate(true);
    if (Object.keys(errors).length) {
      dialog.close();
      showResult("Please fix the highlighted fields before publishing.", "error");
      return;
    }
    const article = getArticle();
    const button = $("confirmPublish");
    button.disabled = true;
    button.textContent = "Publishing…";
    $("publishButton").disabled = true;
    $("publishButton").textContent = "Publishing…";
    showResult("Sending article to the publishing service…", "success");

    try {
      const result = await NivasoftPublisher.publishArticle(article.slug, NivasoftMarkdown.generateMarkdown(article));
      const commitUrl = result.commitUrl || result.commit_url || result.html_url || "";
      dialog.close();
      showResult(result.message || "GitHub confirmed that the article was committed successfully.", "success", commitUrl);
    } catch (error) {
      dialog.close();
      showResult(error.message || "Publishing failed. No success was reported.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Confirm and publish";
      $("publishButton").disabled = false;
      $("publishButton").innerHTML = 'Publish article <span>→</span>';
    }
  });

  updatePreview();
})();
