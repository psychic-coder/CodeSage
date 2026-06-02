import { ArchitecturePage } from "@/components/architecture-page";

export default function ArchitectureRoute({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  return <ArchitecturePage projectId={projectId} />;
}
