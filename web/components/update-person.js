export async function updatePerson(personId, body) {
  const response = await fetch(`/api/people/${personId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Could not update person.");
  }

  return response.json();
}
