import RoleSwitcher from "@/components/layout/RoleSwitcher";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RoleSwitcher currentPath="/" />
    </>
  );
}
