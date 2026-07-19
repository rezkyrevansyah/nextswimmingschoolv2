export interface Notification {
  id: string;
  title: string;
  body?: string;
  time: string;
  icon: string;
  kind: "info" | "warn" | "danger" | "success";
  read?: boolean;
}

export const WA_NUMBER = "082110009667";
export const SCHOOL_EMAIL = "nextcanswim@gmail.com";
