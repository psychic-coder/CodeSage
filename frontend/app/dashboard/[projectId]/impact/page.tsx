import { ImpactPage } from "@/components/impact-page";

export default function ImpactRoute({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  return <ImpactPage projectId={projectId} />;
}
