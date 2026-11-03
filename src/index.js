const ALLOWED_ORIGIN = "https://nivasoft-admin.github.io";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const respond = (data, status = 200) =>
      Response.json(data, { status, headers: corsHeaders });

    if (origin !== ALLOWED_ORIGIN) {
      return respond({ error: "Origin not allowed" }, 403);
    }

    if (request.method !== "POST") {
      return respond({ error: "Method not allowed" }, 405);
    }

    try {
      const { slug, markdown } = await request.json();

      if (
        !slug ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        typeof markdown !== "string" ||
        !markdown.startsWith("---\n") ||
        markdown.length > 100000
      ) {
        return respond({ error: "Invalid article data" }, 400);
      }

      const owner = env.GITHUB_OWNER;
      const repo = env.GITHUB_REPO;
      const branch = env.GITHUB_BRANCH || "production";
      const path = `content/blog/${slug}.md`;

      const apiUrl =
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      const headers = {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Nivasoft-Blog-Publisher",
      };

      // Prevent accidental overwriting of existing articles.
      const existing = await fetch(
        `${apiUrl}?ref=${encodeURIComponent(branch)}`,
        { headers }
      );

      if (existing.ok) {
        return respond({ error: "An article with this slug already exists" }, 409);
      }

      if (existing.status !== 404) {
        return respond({ error: "Could not check existing article" }, 502);
      }

      const commit = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Add blog: ${slug}`,
          content: btoa(
            String.fromCharCode(...new TextEncoder().encode(markdown))
          ),
          branch,
        }),
      });

      const result = await commit.json();

      if (!commit.ok) {
        return respond({ error: result.message || "GitHub commit failed" }, 502);
      }

      return respond({
        success: true,
        message: "Article committed successfully",
        path,
        commit: result.commit.html_url,
      });

    } catch (error) {
      return respond({ error: "Publishing failed" }, 500);
    }
  },
};