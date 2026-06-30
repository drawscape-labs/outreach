// Browser-safe fetch wrappers for internal app routes.
// Add client API calls here so UI components share JSON encoding and ApiError handling.
export class ApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function requestBody(body) {
  if (body === undefined || body === null || typeof body === "string" || isFormData(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function requestHeaders(body, headers = {}) {
  if (body === undefined || body === null || typeof body === "string" || isFormData(body)) {
    return headers;
  }

  return {
    "Content-Type": "application/json",
    ...headers
  };
}

async function readPayload(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  return response.text().catch(() => "");
}

export async function apiRequest(path, { body, headers, ...options } = {}) {
  const response = await fetch(path, {
    ...options,
    headers: requestHeaders(body, headers),
    body: requestBody(body)
  });
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(
      payload?.error || payload || "Request failed.",
      {
        status: response.status,
        payload
      }
    );
  }

  return payload;
}

export const codexApi = {
  launch(body) {
    return apiRequest("/api/codex", {
      method: "POST",
      body
    });
  }
};

export const peopleApi = {
  update(personId, body) {
    return apiRequest(`/api/people/${encodeURIComponent(personId)}`, {
      method: "PATCH",
      body
    });
  }
};

export const quickmailApi = {
  async listCampaigns() {
    const payload = await apiRequest("/api/quickmail/campaigns");

    return payload.campaigns || [];
  },

  addLeadToCampaign(campaignId, body) {
    return apiRequest(
      `/api/quickmail/campaigns/${encodeURIComponent(campaignId)}/leads`,
      {
        method: "POST",
        body
      }
    );
  }
};
