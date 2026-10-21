import { dependencyValues } from "./dependencies";
import { Field } from "./fields/field";
import { HasWhen, mixin, WithMeta } from "./mixin";
import { includes, Node } from "./node";
import { S } from "./s";
import { descendants } from "./walk";

export type RegionRender = (deps: Record<string, string>, s: S) => unknown;

/**
 * Server-rendered region that re-renders when declared form fields change
 * (LiveRegionBuilder.php). The render closure runs at page assembly and per
 * endpoint request: a pure function of its deps, display nodes only.
 */
export class LiveRegion {
	private deps: string[] = [];
	private renderFn?: RegionRender;
	private initialDeps: Record<string, string> = {};
	private metaBag: Record<string, unknown> = {};

	constructor(readonly name: string) {}

	/** The form field(s) whose changes reload this region. */
	dependsOn(fields: string | string[]): this {
		this.deps = typeof fields === "string" ? [fields] : fields;
		return this;
	}

	/** The content: `(deps, s) => node | node[]`, display nodes only. */
	render(fn: RegionRender): this {
		this.renderFn = fn;
		return this;
	}

	dependsOnFields(): string[] {
		return this.deps;
	}

	seedInitialDeps(record: Record<string, unknown>): void {
		this.initialDeps = dependencyValues(this.deps, record);
	}

	async renderWith(deps: Record<string, unknown>): Promise<unknown[]> {
		if (this.renderFn === undefined) {
			throw new Error(`liveRegion "${this.name}" needs a render() closure.`);
		}
		const result = await this.renderFn(dependencyValues(this.deps, deps), new S());
		const nodes = Array.isArray(result) ? result : [result];
		this.assertDisplayOnly(nodes);
		return nodes.filter(includes);
	}

	toNode(): Node {
		const options = {
			dependsOn: this.deps,
			initialDeps: this.initialDeps,
			initial: this.renderWith(this.initialDeps),
		};
		return new Node("liveRegion", options, this.name, this.metaBag).when(this.isIncluded());
	}

	toJSON(): unknown {
		return this.toNode().toJSON();
	}

	private assertDisplayOnly(nodes: unknown[]): void {
		for (const node of nodes) {
			if (node instanceof Field) {
				throw new TypeError(
					`liveRegion "${this.name}" render() returned field "${node.name}" — regions may contain display nodes only.`,
				);
			}
			if (node instanceof Node) {
				this.assertDisplayOnly(descendants(node));
			}
		}
	}
}
export interface LiveRegion extends HasWhen, WithMeta {}
mixin(LiveRegion, [HasWhen, WithMeta]);
