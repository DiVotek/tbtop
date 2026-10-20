import { afterEach, beforeEach, expect, test } from "bun:test";
import { scrollToFirstError } from "./scrollToFirstError";

let original: Element["scrollIntoView"];
beforeEach(() => {
	original = Element.prototype.scrollIntoView;
	Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
	Element.prototype.scrollIntoView = original;
	document.body.innerHTML = "";
});

test("a repeater sub-field error focuses that sub-field's control", () => {
	const form = document.createElement("form");
	form.innerHTML = `<div data-field-name="items"><div data-field-name="items.0.label"><input id="label" /></div></div>`;
	document.body.append(form);
	scrollToFirstError({ "items.0.label": "Required" }, form, null);
	expect(document.activeElement?.id).toBe("label");
});
