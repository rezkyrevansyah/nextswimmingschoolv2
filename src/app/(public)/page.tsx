import type { Metadata } from "next";
import Logo from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "Next Swimming School",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Logo size={56} withWord />
    </div>
  );
}
