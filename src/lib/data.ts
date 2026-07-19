// ============================================================================
// Mock data store for the ROLE PANELS (owner/admin/coach/member/school) only.
// This is NOT the landing page content source. Landing sections fetch from
// Supabase and fall back to their own inline _DEFAULTS. Do not wire this file
// into the public landing page.
// Replace with Supabase queries when the panels are connected to the backend.
// ============================================================================

const today = new Date();
today.setHours(0, 0, 0, 0);

const addD = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  wa: string[];
  logoTone: string;
  members: number;
  coaches: number;
  classes: number;
  color: string;
}

export interface Program {
  id: string;
  name: string;
  age: string;
  price: number;
  sessions: string;
  desc: string;
  show: boolean;
  benefit: string[];
}

export interface Coach {
  id: string;
  code: string;
  name: string;
  nick: string;
  spec: string;
  certs: string[];
  photo: string;
  status: "active" | "suspended";
  bank: string;
}

export interface Class {
  id: string;
  branch: string;
  name: string;
  age: string;
  coach: string;
  price: number;
  cap: number;
  enrolled: number;
  days: string[];
  time: string;
  showLanding: boolean;
  prog: string;
  spreadsheet: boolean;
}

export interface Member {
  id: string;
  name: string;
  age: number;
  parent: string | null;
  phone: string;
  type: "reguler" | "private" | "school_affiliate";
  class: string[];
  status: "active" | "suspended";
  branch: string;
  payStatus: "paid" | "unpaid" | "school_covered";
  start: string;
  qr: string;
  school?: string;
  remainingSessions?: number;
  totalSessions?: number;
  suspendUntil?: Date;
}

export interface School {
  id: string;
  name: string;
  email: string;
  branch: string;
  members: number;
  monthlyCovered: number;
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  time: string;
  icon: string;
  kind: "info" | "warn" | "danger" | "success";
  read?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  target: string;
  until: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface AttendanceEntry {
  id: string;
  who: string;
  what: string;
  time: string;
  method: "selfie" | "qr" | "manual";
  by?: string;
  distance?: number;
}

// ── Data ─────────────────────────────────────────────────────────────────────

export const BRANCHES: Branch[] = [
  { id: "br-jkt-selatan", name: "Cabang Jakarta Selatan", address: "Jl. Kemang Raya 88, Jakarta Selatan", lat: -6.2615, lng: 106.8106, wa: ["082110009667", "081234567890"], logoTone: "ocean", members: 142, coaches: 8, classes: 12, color: "#0E4F8F" },
  { id: "br-bgr",         name: "Cabang Bogor",            address: "Jl. Pajajaran 12, Bogor Tengah",       lat: -6.5970, lng: 106.7960, wa: ["082110009800"],               logoTone: "wave",  members: 88,  coaches: 5, classes: 7,  color: "#16B0E8" },
  { id: "br-bdg",         name: "Cabang Bandung",          address: "Jl. Setiabudhi 220, Bandung",          lat: -6.8704, lng: 107.5912, wa: ["082110009900"],               logoTone: "ocean", members: 104, coaches: 6, classes: 9,  color: "#1A6BB0" },
];

export const PROGRAMS: Program[] = [
  { id: "p-kids",    name: "Kids Class",           age: "5–10 thn",  price: 550000,  sessions: "4 sesi/bulan", desc: "Pengenalan air, dasar gaya bebas, dan keamanan kolam dengan pendekatan bermain.", show: true,  benefit: ["Coach bersertifikat anak", "Rasio kecil", "Modul rapor 6-bulanan"] },
  { id: "p-teen",    name: "Teen Class",           age: "11–17 thn", price: 650000,  sessions: "4 sesi/bulan", desc: "Teknik 4 gaya, daya tahan, dan peningkatan performa untuk pelajar.",           show: true,  benefit: ["Drill 4 gaya", "Video review", "Mock race bulanan"] },
  { id: "p-adult",   name: "Adult Class",          age: "18+ thn",   price: 750000,  sessions: "4 sesi/bulan", desc: "Belajar renang dari nol atau menyempurnakan teknik bagi dewasa profesional.",  show: true,  benefit: ["Flexible jadwal", "Coach dewasa", "Body posture clinic"] },
  { id: "p-private", name: "Private Coaching",     age: "Semua usia",price: 1500000, sessions: "Paket 6 sesi", desc: "Satu coach, satu murid. Program disesuaikan target personal Anda.",            show: true,  benefit: ["1-on-1", "Custom program", "Jadwal fleksibel"] },
  { id: "p-intense", name: "Intensive Training",   age: "12+ thn",   price: 1200000, sessions: "3x/minggu",    desc: "Untuk member yang ingin masuk klub atau kompetisi.",                            show: true,  benefit: ["Latihan kompetitif", "Strength & conditioning", "Race strategy"] },
  { id: "p-school",  name: "School Collaboration", age: "Sekolah",   price: 0,       sessions: "By contract",  desc: "Program kerja sama untuk sekolah — biaya ditanggung sekolah.",                  show: true,  benefit: ["B2B billing", "Rapor terintegrasi", "Lapor ke sekolah"] },
];

export const COACHES: Coach[] = [
  { id: "c-001", code: "COACH-001", name: "Mas Bagas Pratama",  nick: "Coach Bagas", spec: "Renang Anak & Pemula",   certs: ["Lifeguard ARC 2023", "Renang Anak Level-2", "CPR/First Aid"], photo: "bagas", status: "active",    bank: "BCA 087-1234-5678 a/n Bagas Pratama" },
  { id: "c-002", code: "COACH-002", name: "Ibu Linda Hartono",  nick: "Coach Linda", spec: "4 Gaya & Kompetitif",   certs: ["FINA Coach Lvl 1", "Lifeguard ARC 2024"],                    photo: "linda", status: "active",    bank: "Mandiri 144-0099-8877 a/n Linda H." },
  { id: "c-003", code: "COACH-003", name: "Pak Rizki Aditama",  nick: "Coach Rizki", spec: "Adult & Triathlon",     certs: ["TRI Coach Level 1", "Open Water Safety"],                    photo: "rizki", status: "active",    bank: "BNI 005-7711-2090 a/n Rizki Aditama" },
  { id: "c-004", code: "COACH-004", name: "Mbak Nadia Sari",    nick: "Coach Nadia", spec: "Toddler & Aquatic Play", certs: ["Aquatic for Babies"],                                        photo: "nadia", status: "suspended", bank: "BCA 087-9988-1122 a/n Nadia S." },
  { id: "c-005", code: "COACH-005", name: "Pak Dimas Wirawan",  nick: "Coach Dimas", spec: "Intensive & Squad",     certs: ["FINA Coach Lvl 2", "S&C Cert."],                             photo: "dimas", status: "active",    bank: "BCA 087-3344-5566 a/n Dimas W." },
  { id: "c-006", code: "COACH-006", name: "Mas Yoga Pranata",   nick: "Coach Yoga",  spec: "Private Coaching",      certs: ["Private Coach Cert.", "CPR"],                                photo: "yoga",  status: "active",    bank: "BRI 1234-0099-1100 a/n Yoga P." },
];

export const CLASSES: Class[] = [
  { id: "cl-tadpole",  branch: "br-jkt-selatan", name: "Tadpole — Pengenalan Air", age: "4–6 thn",   coach: "c-001", price: 550000,  cap: 15, enrolled: 12, days: ["Sen", "Rab"],             time: "15:00–16:00", showLanding: true,  prog: "Pengenalan air, blowing bubbles, water comfort.", spreadsheet: true },
  { id: "cl-shark",    branch: "br-jkt-selatan", name: "Shark — Gaya Bebas Dasar", age: "7–10 thn",  coach: "c-001", price: 600000,  cap: 15, enrolled: 15, days: ["Sel", "Kam"],             time: "16:00–17:00", showLanding: true,  prog: "Gaya bebas dasar, body position drill.",          spreadsheet: false },
  { id: "cl-orca",     branch: "br-jkt-selatan", name: "Orca — Empat Gaya",        age: "11–15 thn", coach: "c-002", price: 700000,  cap: 12, enrolled: 10, days: ["Sen", "Rab", "Jum"],      time: "17:00–18:00", showLanding: true,  prog: "Drill 4 gaya, endurance set 200m.", spreadsheet: true },
  { id: "cl-dolphin",  branch: "br-jkt-selatan", name: "Dolphin — Intensive Squad",age: "13–17 thn", coach: "c-005", price: 1200000, cap: 10, enrolled: 8,  days: ["Sen","Sel","Kam","Jum"],   time: "18:00–19:30", showLanding: false, prog: "Program kompetitif, race prep.", spreadsheet: true },
  { id: "cl-adult",    branch: "br-jkt-selatan", name: "Adult — Office Hour",      age: "18+ thn",   coach: "c-003", price: 750000,  cap: 12, enrolled: 9,  days: ["Sel", "Kam"],             time: "19:00–20:00", showLanding: true,  prog: "Stroke clinic, low-impact endurance.", spreadsheet: true },
  { id: "cl-private",  branch: "br-jkt-selatan", name: "Private 1-on-1",           age: "Semua",     coach: "c-006", price: 1500000, cap: 1,  enrolled: 1,  days: ["By appt"],                time: "By appt",     showLanding: false, prog: "Custom per murid.", spreadsheet: true },
  { id: "cl-jr-bogor", branch: "br-bgr",         name: "Junior Bogor",             age: "7–12 thn",  coach: "c-002", price: 550000,  cap: 12, enrolled: 11, days: ["Sab", "Min"],             time: "08:00–09:30", showLanding: true,  prog: "Weekend junior program.", spreadsheet: true },
];

export const MEMBERS: Member[] = [
  { id: "m-001", name: "Arsenio Daud Putra",   age: 9,  parent: "Bpk. Andika Putra",  phone: "0812-3344-5566", type: "reguler",          class: ["cl-shark"],   status: "active",    branch: "br-jkt-selatan", payStatus: "paid",           start: "2024-08-12", qr: "NSS-M-0014-AD2" },
  { id: "m-002", name: "Calista Wijaya",        age: 7,  parent: "Ibu Maya Wijaya",     phone: "0813-9988-7766", type: "reguler",          class: ["cl-tadpole"], status: "active",    branch: "br-jkt-selatan", payStatus: "unpaid",         start: "2025-01-08", qr: "NSS-M-0022-CW1" },
  { id: "m-003", name: "Devano Atharrazka",     age: 13, parent: null,                  phone: "0811-2233-4455", type: "reguler",          class: ["cl-orca"],    status: "active",    branch: "br-jkt-selatan", payStatus: "paid",           start: "2023-11-04", qr: "NSS-M-0033-DA9" },
  { id: "m-004", name: "Bunga Lestari Kusuma",  age: 11, parent: "Ibu Sarah Kusuma",    phone: "0852-6677-8899", type: "reguler",          class: ["cl-orca"],    status: "active",    branch: "br-jkt-selatan", payStatus: "paid",           start: "2024-02-19", qr: "NSS-M-0041-BL3" },
  { id: "m-005", name: "Pratama Aji Nugraha",   age: 34, parent: null,                  phone: "0857-1100-2233", type: "reguler",          class: ["cl-adult"],   status: "active",    branch: "br-jkt-selatan", payStatus: "unpaid",         start: "2024-06-30", qr: "NSS-M-0050-PA7" },
  { id: "m-006", name: "Khansa Aulia Rahma",    age: 15, parent: null,                  phone: "0822-1111-2222", type: "private",          class: ["cl-private"], status: "active",    branch: "br-jkt-selatan", payStatus: "paid",           start: "2025-02-01", qr: "NSS-M-0061-KA4", remainingSessions: 1, totalSessions: 6 },
  { id: "m-007", name: "Bilal Mahendra Yusuf",  age: 10, parent: "Bpk. Yusuf M.",      phone: "0811-9090-1010", type: "school_affiliate", class: ["cl-shark"],   status: "active",    branch: "br-jkt-selatan", payStatus: "school_covered", start: "2024-09-01", qr: "NSS-M-0072-BM5", school: "SD Cendekia Harapan" },
  { id: "m-008", name: "Naura Khaira Putri",    age: 8,  parent: "Ibu Niken P.",        phone: "0813-2020-3030", type: "school_affiliate", class: ["cl-shark"],   status: "active",    branch: "br-jkt-selatan", payStatus: "school_covered", start: "2024-09-01", qr: "NSS-M-0080-NK1", school: "SD Cendekia Harapan" },
  { id: "m-009", name: "Reza Ardiansyah",       age: 30, parent: null,                  phone: "0858-3030-4040", type: "reguler",          class: ["cl-adult"],   status: "suspended", branch: "br-jkt-selatan", payStatus: "paid",           start: "2024-04-12", qr: "NSS-M-0092-RA8", suspendUntil: addD(today, 5) },
];

export const SCHOOLS: School[] = [
  { id: "sc-cendekia", name: "SD Cendekia Harapan", email: "admin@cendekia.sch.id", branch: "br-jkt-selatan", members: 8, monthlyCovered: 4400000 },
  { id: "sc-pelita",   name: "SMP Pelita Bangsa",    email: "admin@pelita.sch.id",   branch: "br-jkt-selatan", members: 5, monthlyCovered: 3250000 },
];

export const NOTIFS_OWNER: Notification[] = [
  { id: "no1", title: "Invoice baru dari Coach Linda", body: "Periode Mei 2026 — Rp 4.200.000 (Cabang Jaksel)", time: "5 menit lalu",  icon: "invoice",  kind: "info" },
  { id: "no2", title: "Invoice baru dari Coach Rizki", body: "Periode Mei 2026 — Rp 3.150.000 (Cabang Jaksel)", time: "12 menit lalu", icon: "invoice",  kind: "info" },
  { id: "no3", title: "Cabang Bandung perlu tarif baru", body: "3 kelas baru belum ada tarif coach.", time: "1 jam lalu", icon: "warning", kind: "warn", read: true },
];

export const NOTIFS_ADMIN: Notification[] = [
  { id: "na1", title: "Registrasi member baru",  body: "Salsabila Az-Zahra menunggu approve.",           time: "2 menit lalu",  icon: "user",     kind: "info" },
  { id: "na2", title: "Izin coach pending",       body: "Coach Bagas mengajukan izin 28 Mei 2026.",       time: "15 menit lalu", icon: "calendar", kind: "warn" },
  { id: "na3", title: "Sertifikasi baru",          body: "Coach Linda — FINA Level 2.",                    time: "30 menit lalu", icon: "shield",   kind: "info" },
  { id: "na4", title: "Tagihan jatuh tempo",       body: "Calista Wijaya — Rp 600.000 (Mei 2026).",       time: "1 jam lalu",    icon: "wallet",   kind: "warn", read: true },
];

export const NOTIFS_COACH: Notification[] = [
  { id: "nc1", title: "Izin Anda disetujui",       body: "Sabtu, 28 Mei 2026 — kelas Shark dialihkan ke Coach Yoga.", time: "baru saja",    icon: "check",  kind: "success" },
  { id: "nc2", title: "Anda jadi coach pengganti", body: "Kelas Tadpole, Senin 26 Mei — Coach Bagas sakit.",          time: "30 menit lalu", icon: "swim",  kind: "info" },
  { id: "nc3", title: "Sertifikasi disetujui",      body: "FINA Coach Level 2 telah diapprove admin.",                 time: "kemarin",      icon: "shield", kind: "success", read: true },
];

export const NOTIFS_MEMBER: Notification[] = [
  { id: "nm1", title: "Tagihan Mei 2026 tersedia",   body: "Rp 600.000 — jatuh tempo 7 hari lagi.",         time: "baru saja",  icon: "wallet",  kind: "warn" },
  { id: "nm2", title: "Rapor Semester 1 tersedia",   body: "Coach Bagas telah mengisi rapor Anda.",         time: "2 jam lalu", icon: "book",    kind: "info" },
  { id: "nm3", title: "Sisa paket private tinggal 1", body: "Sesi terakhir paket Anda akan datang segera.", time: "kemarin",    icon: "sparkle", kind: "warn", read: true },
];

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "an1", title: "Libur Idul Adha — 6 Juni 2026", body: "Seluruh kelas libur pada hari Jumat 6 Juni 2026. Kelas pengganti akan dijadwalkan minggu berikutnya.", target: "Semua kelas", until: "2026-06-06" },
  { id: "an2", title: "Time trial 100m gaya bebas",    body: "Kelas Orca akan mengadakan time trial. Mohon datang 15 menit lebih awal.", target: "Kelas Orca", until: "2026-06-15" },
];

export const TESTIMONIALS: Testimonial[] = [
  { id: "t1", name: "Ibu Maya Wijaya",   role: "Ibu dari Calista (7 thn)", text: "Anak saya yang awalnya takut air, sekarang antusias setiap kelas. Coach Bagas sabar luar biasa." },
  { id: "t2", name: "Bpk. Andika Putra", role: "Ayah dari Arsenio (9 thn)", text: "Sistem QR memudahkan saya pantau kehadiran. Rapor dari coach sangat detail." },
  { id: "t3", name: "Reza Ardiansyah",   role: "Adult Member",              text: "Dari benar-benar tidak bisa renang, sekarang bisa nyaman 500m. Worth every rupiah." },
];

export const FAQS: FAQ[] = [
  { q: "Mulai usia berapa anak bisa ikut?",       a: "Mulai 4 tahun untuk kelas Tadpole — pengenalan air. Untuk usia di bawahnya tersedia private dengan pendamping orang tua." },
  { q: "Bagaimana sistem pembayarannya?",          a: "Member reguler bayar per bulan, member private bayar per paket sesi. Konfirmasi pembayaran via WhatsApp ke admin cabang." },
  { q: "Apakah bisa private 1-on-1?",              a: "Ya. Paket 6 sesi atau 12 sesi tersedia. Jadwal dan lokasi fleksibel — diskusikan dengan admin." },
  { q: "Bagaimana cara absensinya?",               a: "Setiap member punya QR code unik yang bisa diprint. Coach scan QR di awal sesi. Orang tua bisa pantau via member page." },
  { q: "Apakah ada rapor?",                         a: "Ya — setiap semester. Coach mengisi penilaian berdasarkan aspek yang dikonfigurasi admin. Member juga bisa beri review ke coach." },
  { q: "Apakah bisa untuk sekolah / B2B?",          a: "Bisa. Kami punya program School Collaboration — sekolah membayar langsung dan dapat akses School Panel untuk pantau rapor." },
];

export const ATTENDANCE_TODAY: AttendanceEntry[] = [
  { id: "at1", who: "Coach Bagas",  what: "Clock-In • Kelas Tadpole", time: "14:48", method: "selfie", distance: 18 },
  { id: "at2", who: "Arsenio Daud", what: "Hadir • Kelas Shark",      time: "15:55", method: "qr",     by: "Coach Bagas" },
  { id: "at3", who: "Bunga Lestari",what: "Hadir • Kelas Orca",       time: "16:58", method: "qr",     by: "Coach Linda" },
  { id: "at4", who: "Devano A.",    what: "Hadir • Kelas Orca",       time: "16:59", method: "manual", by: "Coach Linda" },
];

// ── Constants ─────────────────────────────────────────────────────────────────
export const WA_NUMBER = "082110009667";
export const SCHOOL_EMAIL = "nextcanswim@gmail.com";
