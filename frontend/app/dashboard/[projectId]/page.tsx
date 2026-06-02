import { ProjectOverviewPage } from "@/components/project-overview-page";

export default function ProjectOverviewRoute({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  return <ProjectOverviewPage projectId={projectId} />;
}
