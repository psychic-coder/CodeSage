import { DependencyGraphPage } from "@/components/dependency-graph-page";

export default function GraphRoute({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  return <DependencyGraphPage projectId={projectId} />;
}
