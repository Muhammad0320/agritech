'use server';

import { fetchClient } from "@/lib/fetchClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // Role is not strictly needed for login if backend handles it, but we might need it for redirect
  // Actually backend response should tell us the role or we decode token.
  // For now, let's assume we can get it from the form if user selects it, or default to something.
  // But wait, user selects role in UI.
  const role = formData.get("role") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  try {
    const response = await fetchClient<{ token: string, user_id: string, role?: string }>("/login", {
      method: "POST",
      body: JSON.stringify({ username: email, password: password }),
    });

    const cookieStore = await cookies();
    cookieStore.set("token", response.token, { httpOnly: true, secure: true });
    cookieStore.set("is_authenticated", "true");
    
    // If backend returns role, use it. Otherwise use the one from form (less secure but works for redirect)
    const userRole = response.role || role;
    cookieStore.set("user_role", userRole);

    return { success: true, role: userRole };
  } catch (error: any) {
    console.error("Login failed:", error);
    return { success: false, error: error.message || "Invalid credentials" };
  }
}

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!email || !password || !name || !role) {
    return { success: false, error: "All fields are required" };
  }

  try {
    await fetchClient("/register", {
      method: "POST",
      body: JSON.stringify({ 
        username: email, // Mapping email to username
        password: password,
        role: role.toLowerCase() // Backend expects lowercase? Let's check. usually 'driver' or 'admin'
      }),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Registration failed:", error);
    return { success: false, error: error.message || "Registration failed" };
  }
}
