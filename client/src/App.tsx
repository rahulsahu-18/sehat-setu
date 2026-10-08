import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import PatientAuth from "./pages/authPages/PatientAuth";
import HealthcareStaffAuth from "./pages/authPages/HealthcareStaffAuth";
import FacilityRedg from "./pages/authPages/FacilityRedg";
import FacilityAdminDashboard from "./pages/authPages/FacilityAdminDashboard";
import PatientCareSetup from "./pages/PatientCareSetup";
import PatientIntakePage from "./pages/PatientIntakePage";
import PatientCasesPage from "./pages/PatientCasesPage";
import HealthcareStaffDashboard from "./pages/HealthcareStaffDashboard";
import StaffCaseDetailPage from "./pages/StaffCaseDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/auth/patient" element={<PatientAuth />} />
        <Route path="/auth/facility" element={<FacilityRedg />} />

        <Route path="/auth/doctor" element={<HealthcareStaffAuth />} />
        <Route path="/auth/nurse" element={<HealthcareStaffAuth />} />
        <Route path="/patient/setup" element={<PatientCareSetup />} />
        <Route path="/patient/cases" element={<PatientCasesPage />} />
        <Route path="/patient/intake/:caseId" element={<PatientIntakePage />} />
        <Route path="/staff/dashboard" element={<HealthcareStaffDashboard />} />
        <Route path="/staff/cases/:caseId" element={<StaffCaseDetailPage />} />
        <Route
          path="/facility/dashboard"
          element={<FacilityAdminDashboard />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
