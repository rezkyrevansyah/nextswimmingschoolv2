"use client";
import { useOwnerSchoolsData } from "./useOwnerSchoolsData";
import SchoolListPanel from "./SchoolListPanel";
import SchoolConfigPanel from "./SchoolConfigPanel";
import SignatureModal from "./SignatureModal";
import type { Branch } from "../../_types";

export default function OwnerSchools({}: { branches: Branch[] }) {
  const hook = useOwnerSchoolsData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <SchoolListPanel hook={hook} />
        <SchoolConfigPanel hook={hook} />
      </div>

      {/* Modal Add / Edit Signature */}
      <SignatureModal hook={hook} />
    </div>
  );
}
