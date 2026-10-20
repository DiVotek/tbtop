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

test("a row-level error key does not switch the locale to the row index", () => {
	const form = document.createElement("form");
	form.innerHTML = `<div data-field-name="items"><input /></div>`;
	document.body.append(form);
	const switched: string[] = [];
	scrollToFirstError({ "items.0": "Invalid row" }, form, {
		locales: ["en", "uk"],
		setActive: (l) => switched.push(l),
	});
	expect(switched).toEqual([]);
});

test("a translatable error key still switches to its locale", () => {
	const form = document.createElement("form");
	form.innerHTML = `<div data-field-name="title"><input /></div>`;
	document.body.append(form);
	const switched: string[] = [];
	scrollToFirstError({ "title.uk": "Required" }, form, {
		locales: ["en", "uk"],
		setActive: (l) => switched.push(l),
	});
	expect(switched).toEqual(["uk"]);
});
