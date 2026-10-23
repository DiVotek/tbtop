import { HttpError } from "../http";

/** A tool call the agent can fix (unknown id, missing params, …); its message goes back verbatim. */
export class AgentError extends Error {}

export interface ToolResult {
	content: { type: "text"; text: string }[];
	isError?: true;
}

const SERVER_ERROR = "Server error; see the application log.";

const text = (value: unknown): ToolResult => ({
	content: [{ type: "text", text: JSON.stringify(value) }],
});

/** Every tool error has one shape: {message, errors?}. */
const error = (message: string, extra: Record<string, unknown> = {}): ToolResult => ({
	...text({ message, ...extra }),
	isError: true,
});

/**
 * AnswersAgent: outcomes an agent can act on become tool errors with a
 * readable message. Anything else, and any status >= 500, is reported and
 * answered generically, so exception text (SQL, paths) never reaches the agent.
 */
export async function answer(
	work: () => Promise<unknown>,
	report: (error: unknown) => void,
): Promise<ToolResult> {
	try {
		return text(await work());
	} catch (thrown) {
		if (thrown instanceof AgentError) {
			return error(thrown.message);
		}
		const status = statusOf(thrown);
		if (status === null || status >= 500) {
			report(thrown);
			return error(SERVER_ERROR);
		}
		return httpError(thrown as HttpError | Response, status);
	}
}

function statusOf(thrown: unknown): number | null {
	if (thrown instanceof HttpError || thrown instanceof Response) {
		return thrown.status;
	}
	return null;
}

async function httpError(thrown: HttpError | Response, status: number): Promise<ToolResult> {
	const body = thrown instanceof HttpError ? thrown.body : await responseBody(thrown);
	const fromBody = typeof body.message === "string" ? body.message : "";
	const message = thrown instanceof HttpError ? thrown.message : fromBody;
	if (status === 422 && body.errors !== undefined) {
		return error("Validation failed; nothing was run.", { errors: body.errors });
	}
	if (status === 401) {
		return error("Unauthenticated.");
	}
	if (status === 403) {
		return error(`Forbidden: ${message || "This action is unauthorized."}`);
	}
	return error(message || `HTTP ${status}`);
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
	const body: unknown = await response.json().catch(() => null);
	return body !== null && typeof body === "object" ? (body as Record<string, unknown>) : {};
}
