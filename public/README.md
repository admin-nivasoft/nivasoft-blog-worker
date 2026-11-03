# Nivasoft Admin – Insights Publishing Portal

A lightweight, standalone static publishing interface built with HTML5, CSS3 and vanilla JavaScript. It generates the YAML frontmatter and Markdown body expected by the Nivasoft blog parser, and can send articles to a separately deployed Cloudflare Worker.

## Project structure

```text
nivasoft-admin/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── markdown-generator.js
│   └── publisher.js
└── README.md
```

## Run locally

No build process or package installation is required. Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Configure publishing

1. Open `js/publisher.js`.
2. Replace `REPLACE_WITH_ACTUAL_WORKER_URL` with the HTTPS URL of the deployed Cloudflare Worker.
3. Commit and deploy the static site.

The frontend sends a `POST` request with `Content-Type: application/json` and this body:

```json
{
  "slug": "article-slug",
  "markdown": "complete generated markdown content"
}
```

The Worker must independently authenticate each publishing request, validate the slug and Markdown, and create the GitHub commit. CORS is not authentication. Do not put GitHub tokens, Worker secrets, or credentials in this repository or frontend JavaScript.

### Worker response contract

The UI treats a response as successful only when the Worker returns HTTP 2xx and explicitly confirms a commit. Recommended response:

```json
{
  "success": true,
  "committed": true,
  "message": "Article committed successfully.",
  "commitUrl": "https://github.com/ORG/REPO/commit/COMMIT_SHA"
}
```

For errors, return an appropriate HTTP status and a human-readable `message` or `error` field:

- `400`: invalid request or Markdown
- `401` / `403`: unauthenticated or unauthorized
- `409`: slug already exists
- `5xx`: GitHub API or Worker failure

A 2xx response without `committed: true` (or the documented compatibility confirmation fields) is not displayed as a successful publication. Keep the Worker contract aligned with `js/publisher.js`.

## GitHub Pages deployment

1. Create a separate repository for this admin frontend. Do not add these files to the existing Nivasoft website repository.
2. Push the contents of this folder to the repository's default branch.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**, choose the default branch and `/ (root)`, then save.
5. Wait for GitHub Pages to publish the site and use the generated Pages URL.

All CSS and JavaScript references are relative, so the portal works when hosted from a repository subpath.

## Markdown output

The generator emits required fields in the agreed order. Optional `tags`, `linkedin`, `statValue`, and `statLabel` are omitted when empty. `featured` and `draft` are emitted only when checked. YAML string values are escaped using JSON string encoding, which is compatible with YAML double-quoted scalars. The article body is retained as Markdown and the generated file ends with a newline.

The intended content path is `content/blog/<slug>.md`; the public article route is `/blog/<slug>/`.

## Validation and limitations

The browser validates required fields, category, date, slug format, article body and HTTPS LinkedIn URL before opening the publish confirmation. The static portal does not provide user authentication; authorization belongs in the Cloudflare Worker. A public GitHub Pages URL should therefore be treated as an untrusted client.
