import { OnboardingPage } from "@/components/onboarding-page";

export default function OnboardingRoute({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  return <OnboardingPage projectId={projectId} />;
}
