import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalFilterBar from "./GlobalFilterBar";

export default function Layout() {
  return (
    <div className="grid grid-cols-[220px_1fr] min-h-screen bg-bg">
      <Sidebar />
      <main className="overflow-x-auto">
        <GlobalFilterBar />
        <Outlet />
      </main>
    </div>
  );
}
