import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/AppLayout.tsx";
import { HomeRedirect, PublicOnly, RequireRole, RequireSession } from "./components/RouteGuards.tsx";
import { NotificationProvider } from "./context/NotificationContext.tsx";
import { SpecialtyProvider } from "./context/SpecialtyContext.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ManagerPage } from "./pages/ManagerPage.tsx";
import { SignupPage } from "./pages/SignupPage.tsx";
import { TeamPage } from "./pages/TeamPage.tsx";
import { UserPage } from "./pages/UserPage.tsx";
import { WorkerPage } from "./pages/WorkerPage.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
        <Route path="/company/new" element={<Navigate to="/signup" replace />} />

        <Route
          element={(
            <RequireSession>
              <NotificationProvider>
                <SpecialtyProvider>
                  <AppLayout />
                </SpecialtyProvider>
              </NotificationProvider>
            </RequireSession>
          )}
        >
          <Route path="/user" element={<RequireRole roles={["user"]}><UserPage /></RequireRole>} />
          <Route path="/worker" element={<RequireRole roles={["worker"]}><WorkerPage /></RequireRole>} />
          <Route path="/manager" element={<RequireRole roles={["manager"]}><ManagerPage /></RequireRole>} />
          <Route path="/manager/team" element={<RequireRole roles={["manager"]}><TeamPage /></RequireRole>} />
        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
