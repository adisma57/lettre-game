import Layout from "./components/layout/Layout";

// Root of the route tree. Layout provides the persistent NavBar;
// React Router injects the active child page through Layout's <Outlet />.
export default function App() {
  return <Layout />;
}
