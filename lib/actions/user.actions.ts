"use server"

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseStringify } from "../utils";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// Helper to handle API requests safely
const callAuthAPI = async (endpoint: string, options: RequestInit = {}) => {
    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Auth API error (${endpoint}):`, error);
        throw error;
    }
};

// Account creation
export const createAccount = async ({ fullName, email, password }: { fullName: string; email: string; password: string }) => {
    try {
        const result = await callAuthAPI("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({ fullName, email, password }),
        });
        return parseStringify({ accountId: result.accountId });
    } catch (error) {
        console.error("Error creating account:", error);
        throw error;
    }
}

// Resend OTP
export const sendEmailOTP = async (email: string) => {
    try {
        const result = await callAuthAPI("/api/auth/resend-otp", {
            method: "POST",
            body: JSON.stringify({ email }),
        });
        return result.accountId;
    } catch (error) {
        console.error("Error resending OTP:", error);
        throw error;
    }
}

// Sign in User
export const signInUser = async ({ email, password }: { email: string; password: string }) => {
    try {
        const result = await callAuthAPI("/api/auth/signin", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        return parseStringify({ accountId: result.accountId });
    } catch (error) {
        console.error("Error signing in user:", error);
        throw error;
    }
}

// Verify OTP and Authenticate
export const verifySecret = async ({ accountId, password }: { accountId: string; password: string }) => {
    try {
        const result = await callAuthAPI("/api/auth/verify", {
            method: "POST",
            body: JSON.stringify({ accountId, password }),
        });

        // Set cookie for the JWT session
        (await cookies()).set("appwrite-session", result.token, {
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 7,
        });

        return parseStringify({ sessionId: result.sessionId });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        throw error;
    }
}

// Get current user details from JWT cookie
export const getCurrentUserData = async () => {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("appwrite-session")?.value;

        if (!token) {
            return null;
        }

        const user = await callAuthAPI("/api/auth/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return parseStringify(user);
    } catch (error) {
        console.error("Failed to retrieve current user:", error);
        return null;
    }
}

// Sign out user
export const deleteSession = async () => {
    try {
        (await cookies()).delete("appwrite-session");
    } catch (e) {
        console.error("Failed to delete session cookie", e);
    } finally {
        redirect("/sign-in");
    }
}



