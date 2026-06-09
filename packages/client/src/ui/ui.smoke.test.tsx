import { expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

test("UI Button renders text", () => {
	const { getByText } = render(<Button>Click</Button>);
	expect(getByText("Click")).toBeTruthy();
});

test("UI Input accepts a default value", () => {
	const { getByDisplayValue } = render(<Input defaultValue="hi" />);
	expect(getByDisplayValue("hi")).toBeTruthy();
});

test("UI Label renders text", () => {
	const { getByText } = render(<Label htmlFor="x">Name</Label>);
	expect(getByText("Name")).toBeTruthy();
});
