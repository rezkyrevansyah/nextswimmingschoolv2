import type { ScheduleSlot } from "../../_types";

export const EMPTY_CLASS_FORM = { name: "", class_type: "reguler", location_type: "branch", external_location_name: "", external_location_address: "", google_maps_url: "", schedule_days: [] as string[], schedule_times: [] as ScheduleSlot[], same_time_all: true, time_start: "", time_end: "", capacity: "", price_monthly: "", price_per_session: "", goals: "", description: "", photo_url: "" };
export const DAY_OPTS = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
