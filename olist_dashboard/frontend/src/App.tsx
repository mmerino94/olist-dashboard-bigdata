import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Explorador from "./views/Explorador";
import Resumen from "./views/Resumen";
import Rentabilidad from "./views/Rentabilidad";
import Retencion from "./views/Retencion";
import Logistica from "./views/Logistica";
import Vendedores from "./views/Vendedores";
import Satisfaccion from "./views/Satisfaccion";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Explorador />} />
        <Route path="/resumen" element={<Resumen />} />
        <Route path="/rentabilidad" element={<Rentabilidad />} />
        <Route path="/retencion" element={<Retencion />} />
        <Route path="/logistica" element={<Logistica />} />
        <Route path="/vendedores" element={<Vendedores />} />
        <Route path="/satisfaccion" element={<Satisfaccion />} />
      </Route>
    </Routes>
  );
}
