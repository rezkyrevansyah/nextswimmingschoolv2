import type { landing as LandingEn } from "../en/landing";

export const landing: typeof LandingEn = {
  hero: {
    greeting: "Selamat Datang di Next Swimming School",
    subtitle: "Membangun perenang yang percaya diri, satu gaya renang setiap saat.",
    cta: "Mulai Sekarang",
  },
  programs: {
    label: "Program Kami",
    headline: "Temukan kelas yang tepat untuk setiap perenang.",
    subtitle: "Dari pengenalan air pertama hingga gaya kompetitif — program terstruktur untuk semua usia dan tujuan.",
    regular: "Kelas Reguler",
    private: "Kelas Privat",
  },
  partners: {
    label: "Dipercaya oleh Mitra Kami",
    ariaLabel: "Logo mitra",
  },
  nav: {
    logoAlt: "Next Swimming School",
    login: "Masuk",
    groups: {
      programs: {
        label: "Program",
        links: {
          programs: "Program Kami",
          coaches: "Coach Kami",
        },
      },
      about: {
        label: "Tentang Kami",
        links: {
          whyNext: "Kenapa Next",
          testimonials: "Testimoni",
        },
      },
      visit: {
        label: "Kunjungi Kami",
        links: {
          branches: "Cabang Kami",
          faq: "FAQ",
        },
      },
    },
  },
};
