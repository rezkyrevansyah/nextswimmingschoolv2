import type { common as CommonEn } from "../en/common";

export const common: typeof CommonEn = {
  actions: {
    save: "Simpan",
    saving: "Menyimpan…",
    cancel: "Batal",
    add: "Tambah",
    edit: "Edit",
    delete: "Hapus",
    close: "Tutup",
    confirm: "Konfirmasi",
    back: "Kembali",
    retry: "Coba Lagi",
    refresh: "Muat Ulang",
    logout: "Keluar",
    search: "Cari",
    filter: "Filter",
    export: "Ekspor",
    print: "Cetak",
    upload: "Unggah",
    download: "Unduh",
    view: "Lihat",
    approve: "Setujui",
    reject: "Tolak",
  },
  status: {
    active: "Aktif",
    inactive: "Nonaktif",
    archived: "Diarsipkan",
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
    paid: "Lunas",
    unpaid: "Belum Lunas",
  },
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
