import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      {/* Main content area — offset by sidebar width */}
      <div className="lg:pl-[260px]">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
