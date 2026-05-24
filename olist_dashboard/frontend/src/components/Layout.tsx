import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="grid grid-cols-[220px_1fr] min-h-screen bg-bg">
      <Sidebar />
      <main className="overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
