import LandingNav from "./_components/LandingNav";
import Hero from "./_components/Hero";
import WhyUs from "./_components/WhyUs";
import Programs from "./_components/Programs";
import Ecosystem from "./_components/Ecosystem";
import CoachShowcase from "./_components/CoachShowcase";
import Testimonials from "./_components/Testimonials";
import FAQ from "./_components/FAQ";
import FinalCTA from "./_components/FinalCTA";
import LandingFooter from "./_components/LandingFooter";

export default function LandingPage() {
  return (
    <div className="bg-white">
      <LandingNav />
      <Hero />
      <WhyUs />
      <Programs />
      <Ecosystem />
      <CoachShowcase />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
