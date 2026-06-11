import type { RenderProps } from "../../render/blockRegistry";
import type { StatDescriptor } from "./StatCard";
import { StatCard } from "./StatCard";

export function StatBlock({ options }: RenderProps<StatDescriptor>) {
	return <StatCard options={options} />;
}
