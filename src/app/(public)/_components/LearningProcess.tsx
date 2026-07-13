import { TrialButton } from "./TrialBooking";
import { createClient } from "@/utils/supabase/server";

interface Step {
  id: string;
  title: string;
  description: string;
}

const STEPS_DEFAULTS: Step[] = [
  { id: "1", title: "Konsultasi singkat", description: "Ceritakan usia dan tujuan belajar. Kami rekomendasikan level yang cocok." },
  { id: "2", title: "Sesi trial gratis", description: "Coba satu sesi tanpa biaya. Rasakan metode dan kenyamanan kolam kami." },
  { id: "3", title: "Kelas reguler", description: "Mulai kelas rutin. Progres dicatat coach di setiap pertemuan." },
  { id: "4", title: "Review progres", description: "Rapor digital tiap semester agar Anda tahu perkembangan anak." },
];

export default async function LearningProcess() {
  const supabase = await createClient();
  const { data: stepsData } = await supabase
    .from("landing_process_steps")
    .select("id, title, description")
    .order("sort_order");

  const steps = (stepsData && stepsData.length > 0) ? stepsData : STEPS_DEFAULTS;

  return (
    <section id="process" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl mb-14">
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
            Empat langkah dari<br />ragu jadi bisa berenang.
          </h2>
        </div>

        <ol className="relative grid gap-10 lg:grid-cols-4 lg:gap-6">
          <span
            aria-hidden
            className="hidden lg:block absolute top-6 left-0 right-0 h-px bg-line"
          />
          {steps.map((step, i) => (
            <li key={step.id} className="relative">
              <div className="flex items-center gap-4 lg:block">
                <span className="relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl bg-ocean-700 text-white font-display font-extrabold text-lg shrink-0">
                  {i + 1}
                </span>
                <div className="lg:mt-5">
                  <h3 className="font-display font-bold text-lg text-ink">{step.title}</h3>
                  <p className="text-sm text-ink-mute mt-1.5 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 text-center">
          <TrialButton size="lg" />
        </div>
      </div>
    </section>
  );
}
