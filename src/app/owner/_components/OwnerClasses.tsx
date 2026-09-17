"use client";
import OwnerClassesMaster from "./OwnerClassesMaster";
import type { Branch } from "../_types";

export default function OwnerClasses({ branches }: { branches: Branch[] }) {
  return <OwnerClassesMaster branches={branches} />;
}
