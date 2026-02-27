"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAppStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import { ThinkingLawyer } from "./ThinkingLawyer";

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { setRole } = useAppStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                // Fetch user role from Firestore using UID as Primary Key
                try {
                    const userRef = doc(db, "users", user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setRole(userSnap.data().role || 'LAWYER');
                    }
                } catch (err) {
                    console.error("Error fetching user profile:", err);
                }
            } else if (pathname !== "/login") {
                // Redirect to login if not authenticated and not on login page
                router.push("/login");
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [pathname, router, setRole]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {!loading && children}
            {loading && (
                <div className="fixed inset-0 flex items-center justify-center bg-background z-[100]">
                    <ThinkingLawyer message="Preparing Legal Intelligence..." />
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
