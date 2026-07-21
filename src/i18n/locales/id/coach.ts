import type { coach as CoachEn } from "../en/coach";

export const coach: typeof CoachEn = {
  bestTime: {
    sectionTitle: "Personal Best Time",
    hint: "Isi waktu untuk setiap sel, atau kosongkan kalau belum dites.",
    emptyNoTemplate: "Level ini belum punya jarak/gaya — minta owner untuk mengaturnya dulu.",
    otherRecordedTitle: "Waktu Lainnya",
    otherRecordedHint: "Waktu ini direkam sebelum jarak/gaya level ini terakhir diperbarui. Tetap disimpan di sini supaya tidak hilang.",
    timePlaceholder: "NT",
  },
};
