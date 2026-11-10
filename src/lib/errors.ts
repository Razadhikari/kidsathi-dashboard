import { ApiError } from "@/lib/api";

/** Turn an API error into one readable sentence. */
export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "Your role isn't allowed to do this.";
    if (err.data && typeof err.data === "object") {
      return Object.entries(err.data as Record<string, unknown>)
        .map(([field, messages]) => {
          const text = Array.isArray(messages) ? messages.join(" ") : String(messages);
          return field === "detail" || field === "non_field_errors" ? text : `${field.replace(/_/g, " ")}: ${text}`;
        })
        .join(" · ");
    }
    return `Something went wrong (error ${err.status}).`;
  }
  return "Can't reach the server. Is the backend running?";
}
