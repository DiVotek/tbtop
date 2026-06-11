// Enforces the comment rule's caps as a lint error.
// Limits: <=15 words/line, <=2 lines.

const MAX_WORDS_PER_LINE = 15;
const MAX_LINES = 2;

/** @type {import("oxlint").Rule} */
const commentBudget = {
	create(context) {
		const sourceCode = context.sourceCode;
		return {
			Program() {
				for (const comment of sourceCode.getAllComments()) {
					reportComment(context, comment);
				}
			},
		};
	},
};

function reportComment(context, comment) {
	if (isJsDoc(comment)) {
		return;
	}
	const lines = comment.value.split("\n");
	if (lines.length > MAX_LINES) {
		context.report({
			node: comment,
			message: `comment spans ${lines.length} lines (max ${MAX_LINES})`,
		});
	}
	for (const line of lines) {
		const count = wordCount(line);
		if (count > MAX_WORDS_PER_LINE) {
			context.report({
				node: comment,
				message: `comment line has ${count} words (max ${MAX_WORDS_PER_LINE})`,
			});
		}
	}
}

// JSDoc documents the public API — a different genre.
function isJsDoc(comment) {
	return comment.type === "Block" && comment.value.startsWith("*");
}

// Strip leading markers so asterisks don't inflate the count.
function wordCount(line) {
	return line
		.replace(/^[\s*/]+/, "")
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
}

export default {
	meta: { name: "comment-budget" },
	rules: { "comment-budget": commentBudget },
};
