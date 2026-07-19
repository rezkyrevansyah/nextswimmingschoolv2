import type { member as MemberEn } from "../en/member";

export const member: typeof MemberEn = {
  nav: {
    home: "Home", schedule: "Jadwal", attendance: "Absensi", bills: "Tagihan",
    leave: "Izin", rapor: "Rapor", profile: "Profile",
    shortHome: "Home", shortSchedule: "Jadwal", shortAttendance: "Absen", shortBills: "Bayar",
    shortLeave: "Izin", shortRapor: "Rapor", shortProfile: "Saya",
  },
  shell: {
    greeting: "Hai, {name}",
    subMember: "Member · {branch}",
    subSchedule: "Kelas yang Anda ikuti",
    subAttendance: "History kehadiran",
    subBills: "Pembayaran kelas",
    subLeave: "Pengajuan ketidakhadiran",
    subRapor: "Hasil penilaian coach",
    subProfile: "Data pribadi & QR",
  },
  home: {
    welcome: "Selamat datang",
    greeting: "Hai, {name} 👋",
    encouragement: "Semangat latihan hari ini!",
    presentThisMonth: "Hadir bln ini",
    remainingSessions: "Sisa sesi",
    activeClasses: "Kelas aktif",
    billTitle: "Tagihan {period}",
    viewBill: "Lihat Tagihan",
    contactAdmin: "Hubungi Admin",
    packageRunningLow: "Paket sesi hampir habis",
    packageEmpty: "Paket sesi Anda sudah habis. Hubungi admin untuk perpanjangan.",
    packageLow: "Sisa {remaining} sesi terakhir dalam paket. Segera perpanjang agar latihan tidak terputus.",
    renewPackage: "Hubungi Admin — Perpanjang Paket",
    announcement: "PENGUMUMAN",
    upcomingSub: "Sesi mendatang",
    upcomingTitle: "Jadwal terdekat",
    onLeaveBadge: "Izin",
  },
};
