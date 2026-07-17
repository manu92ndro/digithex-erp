import Sidebar from "./Sidebar";

export default function MobilMenu({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">

      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div className="absolute left-0 top-0 h-full w-64 bg-slate-900 shadow-xl">
        <Sidebar onNavigate={onClose} />
      </div>

    </div>
  );
}