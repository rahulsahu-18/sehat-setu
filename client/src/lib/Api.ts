// Works with Vite (import.meta.env.VITE_API_BASE_URL) out of the box.
// If you're on Create React App instead, replace the line below with:
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api/v1";
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export enum FacilityType {
  GOVERNMENT_HOSPITAL = "GOVERNMENT_HOSPITAL",
  PHC = "PHC",
  CAMPUS_HEALTH_CENTER = "CAMPUS_HEALTH_CENTER",
  COMPANY_CLINIC = "COMPANY_CLINIC",
  INDUSTRIAL_HEALTH_UNIT = "INDUSTRIAL_HEALTH_UNIT",
  PUBLIC_HEALTH_CAMP = "PUBLIC_HEALTH_CAMP",
}

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  [FacilityType.GOVERNMENT_HOSPITAL]: "Government hospital",
  [FacilityType.PHC]: "Primary health centre (PHC)",
  [FacilityType.CAMPUS_HEALTH_CENTER]: "Campus health centre",
  [FacilityType.COMPANY_CLINIC]: "Company clinic",
  [FacilityType.INDUSTRIAL_HEALTH_UNIT]: "Industrial health unit",
  [FacilityType.PUBLIC_HEALTH_CAMP]: "Public health camp",
};

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

async function request<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach the server. Check your connection and try again.",
    );
  }

  let json: ApiResponse<T>;

  try {
    json = await res.json();
  } catch {
    throw new Error("Unexpected response from the server.");
  }

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Something went wrong.");
  }

  return json;
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phoneNo: string;
  role: string;
  patientId?: string;
  language?: string;
  facilityId?: string;
}

export interface AuthFacility {
  id: string;
  name: string;
  type: FacilityType;
  location: string;
}

interface PatientAuthData {
  user: AuthUser;
  token: string;
}

interface FacilityRegisterData {
  facility: AuthFacility;
  admin: AuthUser;
  token: string;
}

interface FacilityLoginData {
  user: AuthUser;
  facility: AuthFacility | null;
  token: string;
}

export function registerPatient(payload: {
  name: string;
  phoneNo: string;
  email?: string;
  password: string;
  language?: string;
}) {
  return request<PatientAuthData>("/patient/register", payload);
}

export function loginPatient(payload: {
  identifier: string;
  password: string;
}) {
  return request<PatientAuthData>("/user/login", payload);
}

export function registerFacility(payload: {
  facility: { name: string; type: FacilityType; location: string };
  admin: { name: string; email: string; phoneNo: string; password: string };
}) {
  return request<FacilityRegisterData>("/facility/register", payload);
}

export function loginFacilityAdmin(payload: {
  identifier: string;
  password: string;
}) {
  return request<FacilityLoginData>("/facility/login", payload);
}

export function saveSession(token: string, extra: Record<string, unknown>) {
  localStorage.setItem("setu_token", token);
  localStorage.setItem("setu_session", JSON.stringify(extra));
}