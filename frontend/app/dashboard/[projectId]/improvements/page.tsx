import { ImprovementsPage } from "@/components/improvements-page";

export default function ImprovementsRoute({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  return <ImprovementsPage projectId={projectId} />;
}
