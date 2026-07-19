import type { common as CommonEn } from "../en/common";

export const common: typeof CommonEn = {
  datePicker: {
    placeholder: "Pilih tanggal",
    chooseYear: "Pilih Tahun",
  },
  monthYearPicker: {
    placeholder: "Pilih bulan & tahun",
    chooseYear: "Pilih Tahun",
  },
  timePicker: {
    placeholder: "Pilih jam",
  },
  photoLightbox: {
    uploading: "Mengupload…",
    changePhoto: "Ganti Foto",
  },
  mapPicker: {
    hint: "Klik peta untuk pin lokasi, atau seret marker. Koordinat otomatis terisi di bawah.",
  },
  bell: {
    justNow: "Baru saja",
    minutesAgo: "{n} mnt lalu",
    hoursAgo: "{n} jam lalu",
    daysAgo: "{n} hari lalu",
    title: "Notifikasi",
    unread: "{n} belum dibaca",
    markAllRead: "Tandai semua dibaca",
    empty: "Belum ada notifikasi",
  },
  months: {
    short: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"],
    long: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
  },
  days: {
    short: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  },
  languageSwitcher: {
    en: "EN",
    id: "ID",
  },
};
