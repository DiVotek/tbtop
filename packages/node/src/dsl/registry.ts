import type { ActionBuilder } from "./action";
import type { ChartBuilder } from "./chart";
import { Select } from "./fields/choices";
import type { Field } from "./fields/field";
import { Upload } from "./fields/files";
import { Relation } from "./fields/nested";
import { type Embed, Richtext } from "./fields/richtext";
import { Daterange } from "./fields/temporal";
import type { FormBuilder } from "./form";
import { isConditionMet } from "./inclusion";
import type { LiveRegion } from "./liveRegion";
import type { Stat } from "./stat";
import type { TableBuilder } from "./table/table";

interface Collected {
	forms: FormBuilder;
	actions: ActionBuilder;
	tables: TableBuilder;
	charts: ChartBuilder;
	stats: Stat;
}

/**
 * The request-scoped registries of S: builders register by name before any
 * serialization, so a when(false) entity is found here but never reachable.
 */
export class Registry {
	private readonly collected: { [K in keyof Collected]: Map<string, Collected[K]> } = {
		forms: new Map(),
		actions: new Map(),
		tables: new Map(),
		charts: new Map(),
		stats: new Map(),
	};

	protected register<K extends keyof Collected, T extends Collected[K]>(
		kind: K,
		name: string,
		builder: T,
	): T {
		this.collected[kind].set(name, builder);
		return builder;
	}

	collectedForms(): Map<string, FormBuilder> {
		return this.collected.forms;
	}

	collectedActions(): Map<string, ActionBuilder> {
		return this.collected.actions;
	}

	collectedTables(): Map<string, TableBuilder> {
		return this.collected.tables;
	}

	collectedCharts(): Map<string, ChartBuilder> {
		return this.collected.charts;
	}

	collectedStats(): Map<string, Stat> {
		return this.collected.stats;
	}

	reachableTable(name: string): TableBuilder | null {
		return reachable(this.collected.tables.get(name));
	}

	reachableForm(name: string): FormBuilder | null {
		return reachable(this.collected.forms.get(name));
	}

	reachableChart(name: string): ChartBuilder | null {
		return reachable(this.collected.charts.get(name));
	}

	reachableStat(name: string): Stat | null {
		return reachable(this.collected.stats.get(name));
	}

	/** Actions also re-check authorize() against the gate. */
	reachableAction(name: string): ActionBuilder | null {
		const action = reachable(this.collected.actions.get(name));
		return action?.isAuthorized() === true ? action : null;
	}

	findCreatableSelect(name: string): Select | null {
		return this.findField(
			(f): f is Select =>
				f instanceof Select && f.name === name && f.creatableClosure() !== undefined,
		);
	}

	findQueryableSelect(name: string): Select | null {
		return this.findField(
			(f): f is Select =>
				f instanceof Select && f.name === name && f.queryClosure() !== undefined,
		);
	}

	findDaterangeField(name: string): Daterange | null {
		return this.findField(
			(f): f is Daterange =>
				f instanceof Daterange &&
				f.name === name &&
				f.disabledRangesClosure() !== undefined,
		);
	}

	findRelationField(name: string): Relation | null {
		return this.findField(
			(f): f is Relation =>
				f instanceof Relation && f.name === name && f.queryClosure() !== undefined,
		);
	}

	findUploadField(name: string): Upload | null {
		return this.findField((f): f is Upload => f instanceof Upload && f.name === name);
	}

	findEmbed(fieldName: string, kind: string): Embed | null {
		const field = this.findField(
			(f): f is Richtext =>
				f instanceof Richtext && f.name === fieldName && f.findEmbed(kind) !== null,
		);
		return field?.findEmbed(kind) ?? null;
	}

	findLiveRegion(name: string): LiveRegion | null {
		return this.searchForms((form) => form.findLiveRegion(name));
	}

	private findField<T extends Field>(matches: (field: Field) => field is T): T | null {
		return this.searchForms((form) => form.findField(matches));
	}

	/** First hit across the forms that exist; a when(false) form is skipped whole. */
	private searchForms<T>(search: (form: FormBuilder) => T | null): T | null {
		for (const form of this.collected.forms.values()) {
			if (!form.isIncluded()) {
				continue;
			}
			const found = search(form);
			if (found !== null) {
				return found;
			}
		}
		return null;
	}
}

function reachable<T>(entity: T | undefined): T | null {
	return entity !== undefined && isConditionMet(entity) ? entity : null;
}
