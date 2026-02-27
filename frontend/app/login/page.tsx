"use client";

import { useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import {
    signInWithPopup,
    signInAnonymously,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type UserRole = 'LAWYER' | 'COMMUNITY';

export default function LoginPage() {
    const router = useRouter();
    const { setRole } = useAppStore();

    // CLOSED TRIAL: Sign Up Disabled
    const [isSignUp, setIsSignUp] = useState(false); // Forced false
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [selectedRole, setSelectedRole] = useState<UserRole>('LAWYER');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuthSuccess = async (user: any, role: UserRole) => {
        // Check if user profile exists in Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Create new user profile
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || displayName || "User",
                role: role,
                createdAt: new Date().toISOString()
            });
            setRole(role);
        } else {
            // Update store with existing user role
            const existingData = userSnap.data();
            setRole(existingData.role || 'LAWYER');
        }

        router.push("/");
    };

    const signInWithGoogle = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await handleAuthSuccess(result.user, selectedRole);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            // Guest login defaults to LAWYER mode as requested
            const result = await signInAnonymously(auth);
            await handleAuthSuccess(result.user, 'LAWYER');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isSignUp) {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(result.user, { displayName });
                await handleAuthSuccess(result.user, selectedRole);
            } else {
                const result = await signInWithEmailAndPassword(auth, email, password);
                const userRef = doc(db, "users", result.user.uid);
                const userSnap = await getDoc(userRef);
                const roleToUse = userSnap.exists() ? userSnap.data().role : 'LAWYER';
                await handleAuthSuccess(result.user, roleToUse);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-background px-4">
            {/* Background Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />

            <div className="relative z-10 w-full max-w-md bg-surface border border-border p-8 rounded-2xl shadow-2xl">
                <div className="text-center mb-10 flex flex-col items-center">
                    <img
                        src="/logo.svg"
                        alt="PolyPact Logo"
                        className="w-24 h-24 mb-6 animate-in zoom-in-50 duration-700"
                    />
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2 font-display">PolyPact</h1>
                    <p className="text-text-muted font-bold italic">Advanced Legal Intelligence</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded mb-6 font-bold uppercase tracking-widest">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {isSignUp && (
                        <input
                            type="text"
                            name="displayName"
                            id="displayName"
                            placeholder="Display Name"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    )}
                    <input
                        type="email"
                        name="email"
                        id="email"
                        placeholder="Email Address"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        id="password"
                        placeholder="Password"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {isSignUp && (
                        <div className="pt-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-3 block">Initial Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole('LAWYER')}
                                    className={cn(
                                        "px-4 py-2 text-[10px] font-black uppercase rounded border transition-all",
                                        selectedRole === 'LAWYER' ? "bg-primary text-background border-primary" : "bg-background text-text-muted border-border"
                                    )}
                                >
                                    Lawyer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole('COMMUNITY')}
                                    className={cn(
                                        "px-4 py-2 text-[10px] font-black uppercase rounded border transition-all",
                                        selectedRole === 'COMMUNITY' ? "bg-primary text-background border-primary" : "bg-background text-text-muted border-border"
                                    )}
                                >
                                    Community
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-background font-black py-4 rounded-xl uppercase tracking-widest text-[11px] hover:brightness-110 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                    >
                        {isSignUp ? "Create Account" : "Sign In"}
                    </button>
                </form>

                <div className="relative my-8 opacity-20">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold">
                        <span className="bg-surface px-4 text-text-muted tracking-widest">Or continue with</span>
                    </div>
                </div>

                {/* CLOSED TRIAL - HIDDEN AUTH OPTIONS */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button
                        onClick={signInWithGoogle}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-background border border-border py-3 rounded-xl hover:bg-surface transition-all active:scale-95 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-lg">login</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Google</span>
                    </button>
                    <button
                        onClick={handleGuestLogin}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-background border border-border py-3 rounded-xl hover:bg-surface transition-all active:scale-95 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-lg">person_outline</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Guest</span>
                    </button>
                </div>

                <div className="text-center opacity-40 mt-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        Closed Trial Version. Account Creation Disabled.
                    </p>
                    {/*
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors"
                    >
                        {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create One"}
                    </button>
                    */}
                </div>
            </div>
        </div>
    );
}
