import type { Metadata } from "next";
import Navbar from "./_components/Navbar";

export const metadata: Metadata = {
  title: "Next Swimming School",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
    </div>
  );
}
