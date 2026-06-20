import { BooleanCell, BooleanForm } from "../fields/booleanField";
import { CheckboxCell, CheckboxForm } from "../fields/checkboxField";
import { ColorpickerCell, ColorpickerForm } from "../fields/colorpickerField";
import { DateCell, DateForm, DateTimeCell, DateTimeForm, TimeForm } from "../fields/dateField";
import { DaterangeForm, type DaterangeValue } from "../fields/daterangeField";
import { JsonCell, JsonForm } from "../fields/jsonField";
import { KeyvalueCell, KeyvalueForm } from "../fields/keyvalueField";
import { NumberCell, NumberForm } from "../fields/numberField";
import { OtpCell, OtpForm } from "../fields/otpField";
import { PasswordCell, PasswordForm } from "../fields/passwordField";
import { RadioCell, RadioForm } from "../fields/radioField";
import { RelationCell, RelationForm } from "../fields/relationField";
import { RepeaterCell, RepeaterForm } from "../fields/repeaterField";
import { RichtextCell, type RichtextValue } from "../fields/richtext/richtextCell";
import { RichtextFormLazy } from "../fields/richtext/richtextFormLazy";
import { SelectCell, SelectForm } from "../fields/selectField";
import { SlugCell, SlugForm } from "../fields/slugField";
import { TagsCell, TagsForm } from "../fields/tagsField";
import { TextareaCell, TextareaForm } from "../fields/textareaField";
import { TextCell, TextForm } from "../fields/textField";
import { UnknownCell, UnknownForm } from "../fields/unknownField";
import { UploadCell, UploadForm, type UploadValue } from "../fields/uploadField";
import { MediaPickerCell, MediaPickerForm, type MediaPickerValue } from "../media/mediaPickerField";
import { defineFieldClient } from "./defineFieldClient";

/** Register all built-in field kinds (input, choice, structured). */
export function registerFields(): void {
	registerInputFields();
	registerChoiceFields();
	registerStructuredFields();
}

function registerInputFields(): void {
	defineFieldClient<"text", string>("text", { form: TextForm, cell: TextCell });
	defineFieldClient<"textarea", string>("textarea", {
		form: TextareaForm,
		cell: TextareaCell,
	});
	defineFieldClient<"password", string>("password", {
		form: PasswordForm,
		cell: PasswordCell,
	});
	defineFieldClient<"number", number>("number", { form: NumberForm, cell: NumberCell });
	defineFieldClient<"date", string>("date", { form: DateForm, cell: DateCell });
	defineFieldClient<"datetime", string>("datetime", {
		form: DateTimeForm,
		cell: DateTimeCell,
	});
	defineFieldClient<"time", string>("time", { form: TimeForm, cell: DateCell });
	defineFieldClient<"daterange", DaterangeValue>("daterange", {
		form: DaterangeForm,
		cell: ({ value }) => (value ? `${value.from ?? ""} – ${value.to ?? ""}` : null),
	});
	defineFieldClient<"slug", string>("slug", { form: SlugForm, cell: SlugCell });
	defineFieldClient<"otp", string>("otp", { form: OtpForm, cell: OtpCell });
}

function registerChoiceFields(): void {
	defineFieldClient<"boolean", boolean>("boolean", { form: BooleanForm, cell: BooleanCell });
	defineFieldClient<"checkbox", boolean>("checkbox", {
		form: CheckboxForm,
		cell: CheckboxCell,
	});
	defineFieldClient<"select", string | string[]>("select", {
		form: SelectForm,
		cell: SelectCell,
	});
	defineFieldClient<"radio", string>("radio", { form: RadioForm, cell: RadioCell });
	defineFieldClient<"tags", string[]>("tags", { form: TagsForm, cell: TagsCell });
	defineFieldClient<"in", string[]>("in", { form: TagsForm, cell: TagsCell });
	defineFieldClient<"colorpicker", string>("colorpicker", {
		form: ColorpickerForm,
		cell: ColorpickerCell,
	});
	defineFieldClient<"relation", string>("relation", {
		form: RelationForm,
		cell: RelationCell,
	});
}

function registerStructuredFields(): void {
	defineFieldClient<"json", unknown>("json", { form: JsonForm, cell: JsonCell });
	defineFieldClient<"keyvalue", Record<string, string>>("keyvalue", {
		form: KeyvalueForm,
		cell: KeyvalueCell,
	});
	defineFieldClient<"upload", UploadValue>("upload", { form: UploadForm, cell: UploadCell });
	defineFieldClient<"media", MediaPickerValue>("media", {
		form: MediaPickerForm,
		cell: MediaPickerCell,
	});
	defineFieldClient<"repeater", Record<string, unknown>[]>("repeater", {
		form: RepeaterForm,
		cell: RepeaterCell,
	});
	defineFieldClient<"richtext", RichtextValue>("richtext", {
		form: RichtextFormLazy,
		cell: RichtextCell,
	});
	defineFieldClient<"unknown", unknown>("unknown", { form: UnknownForm, cell: UnknownCell });
}
