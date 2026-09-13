import { Analytics } from "@vercel/analytics/react";
import Layout from "./components/layout/Layout";

// Root of the route tree. React Router injects the active child page
// through Layout's <Outlet />.
export default function App() {
  return (
    <>
      <Layout />
      <Analytics />
    </>
  );
}
