import type { SerializedEditorState } from "lexical";
import { RichtextViewLazy } from "../fields/richtext/richtextViewLazy";
import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";

interface DisplayRichtextOptions {
	state?: SerializedEditorState | null;
}

function hasContent(state: DisplayRichtextOptions["state"]): state is SerializedEditorState {
	return state != null && typeof state === "object" && "root" in state;
}

export function DisplayRichtextBlock({ options }: RenderProps<DisplayRichtextOptions>) {
	if (!hasContent(options.state)) {
		return null;
	}
	return <RichtextViewLazy state={options.state} />;
}

export const displayRichtextBlockDescriptor = defineBlock<
	"displayRichtext",
	DisplayRichtextOptions
>("displayRichtext", { behavior: "leaf", render: DisplayRichtextBlock });
