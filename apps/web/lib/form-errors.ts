import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { say } from "./alfred";
import { ApiError } from "./api";

/**
 * Puts Laravel's validation errors on the matching form fields. Returns the
 * message to show above the form, or null when every error landed on a field.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) {
    return say("error", 0);
  }

  let unmatched = false;
  for (const [field, messages] of Object.entries(error.errors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { message: messages[0] });
    } else {
      unmatched = true;
    }
  }

  const allOnFields = error.status === 422 && !unmatched && Object.keys(error.errors).length > 0;
  return allOnFields ? null : error.message;
}
