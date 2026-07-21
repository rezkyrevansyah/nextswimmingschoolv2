import type { landing as LandingEn } from "../en/landing";

export const landing: typeof LandingEn = {
  hero: {
    greeting: "Selamat Datang di Next Swimming School",
    subtitle: "Membangun perenang yang percaya diri, satu gaya renang setiap saat.",
    cta: "Hubungi Kami",
  },
  programs: {
    label: "Program Kami",
    headline: "Temukan kelas yang tepat untuk setiap perenang.",
    subtitle: "Dari pengenalan air pertama hingga gaya kompetitif — program terstruktur untuk semua usia dan tujuan.",
    regular: "Kelas Reguler",
    private: "Kelas Privat",
    ctaText: "Sudah menemukan kelas yang pas? Amankan tempatnya sekarang.",
    ctaButton: "Daftar Sekarang",
  },
  coaches: {
    label: "Coach Kami",
    headline: "Kenali tim di balik setiap gaya renang.",
    subtitle: "Bersertifikat, berpengalaman, dan sungguh-sungguh peduli pada kemajuan setiap perenang.",
  },
  whyNext: {
    label: "Kenapa Next",
    headline: "Lima alasan keluarga mempercayakan kami.",
    subtitle: "Lebih dari sekadar les renang — sistem lengkap untuk orang tua, coach, dan progres yang bisa dipantau.",
  },
  testimonials: {
    label: "Testimoni",
    headline: "Kata keluarga renang kami.",
    subtitle: "Cerita nyata dari orang tua dan member yang merasakan progresnya langsung.",
    ctaText: "Siap lihat progres yang sama untuk anak Anda?",
    ctaButton: "Daftar Sekarang",
  },
  partners: {
    label: "Dipercaya oleh Mitra Kami",
    ariaLabel: "Logo mitra",
  },
  branches: {
    label: "Cabang Kami",
    headline: "Kunjungi cabang terdekat dari Anda.",
    subtitle: "Cabang aktif yang siap menyambut perenang baru.",
    viewOnMap: "Lihat di Maps",
    chatOnWhatsapp: "Chat via WhatsApp",
  },
  faq: {
    label: "FAQ",
    headline: "Pertanyaan yang sering diajukan.",
    subtitle: "Tidak menemukan yang Anda cari? Hubungi kami via WhatsApp.",
    ctaText: "Masih ada pertanyaan?",
    ctaButton: "Chat via WhatsApp",
    ctaMessage: "Halo Admin Next Swimming School, saya punya pertanyaan yang belum terjawab di FAQ.",
  },
  footer: {
    linksHeading: "Jelajahi",
    contactHeading: "Kontak",
    followHeading: "Ikuti Kami",
    copyrightFallback: "© {year} Next Swimming School. Semua hak dilindungi.",
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
