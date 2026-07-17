import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MobilMenu from "../components/MobilMenu";

export default function DashboardLayout({ children }) {
  const [openMenu, setOpenMenu] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">

      <div className="hidden lg:block fixed left-0 top-0 h-screen">
        <Sidebar />
      </div>

      <MobilMenu
        open={openMenu}
        onClose={() => setOpenMenu(false)}
      />

      <div className="lg:ml-64 min-h-screen flex flex-col">

        <Navbar onOpenMenu={() => setOpenMenu(true)} />

        <main className="p-4 sm:p-5 lg:p-6">
          {children}
        </main>

      </div>

    </div>
  );
}