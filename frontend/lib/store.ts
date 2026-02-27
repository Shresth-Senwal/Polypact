import { create } from 'zustand';
import { CaseContainer } from '../../shared/types';
import { persist } from 'zustand/middleware';

export type UserRole = 'LAWYER' | 'COMMUNITY';

interface AppState {
    // Global User State
    role: UserRole;
    isMobileSidebarOpen: boolean;
    isMainSidebarCollapsed: boolean;
    isChatHistoryCollapsed: boolean;
    isResearchHistoryCollapsed: boolean;

    // Case Context State
    activeCase: CaseContainer | null;
    cases: CaseContainer[];
    isTemporaryMode: boolean;

    // Chat Session state
    chatSessions: any[];
    activeSessionId: string | null;

    // Actions
    toggleRole: () => void;
    setRole: (role: UserRole) => void;
    toggleMobileSidebar: () => void;
    toggleMainSidebar: () => void;
    setMainSidebarCollapsed: (isCollapsed: boolean) => void;
    toggleChatHistory: () => void;
    setChatHistoryCollapsed: (isCollapsed: boolean) => void;
    toggleResearchHistory: () => void;
    setResearchHistoryCollapsed: (isCollapsed: boolean) => void;
    setActiveCase: (caseContainer: CaseContainer | null) => void;
    setCases: (cases: CaseContainer[]) => void;
    startTemporaryCase: (details?: { title?: string; client?: string; legalSide?: "PROSECUTION" | "DEFENSE" | "CORPORATE" | "FINANCIAL" | "CIVIL" | "GENERAL"; jurisdiction?: { country: 'IN', state: string, city?: string } }) => void;
    exitTemporaryCase: () => void;
    setChatSessions: (sessions: any[]) => void;
    setActiveSessionId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            role: 'LAWYER',
            isMobileSidebarOpen: false,
            isMainSidebarCollapsed: true,
            isChatHistoryCollapsed: false,
            isResearchHistoryCollapsed: false,
            activeCase: null,
            cases: [],
            isTemporaryMode: false,
            chatSessions: [],
            activeSessionId: null,

            toggleRole: () => set((state) => ({
                role: state.role === 'LAWYER' ? 'COMMUNITY' : 'LAWYER'
            })),

            setRole: (role) => set({ role }),

            toggleMobileSidebar: () => set((state) => ({
                isMobileSidebarOpen: !state.isMobileSidebarOpen
            })),

            toggleMainSidebar: () => set((state) => ({
                isMainSidebarCollapsed: !state.isMainSidebarCollapsed
            })),
            setMainSidebarCollapsed: (isCollapsed) => set({ isMainSidebarCollapsed: isCollapsed }),

            toggleChatHistory: () => set((state) => ({
                isChatHistoryCollapsed: !state.isChatHistoryCollapsed
            })),
            setChatHistoryCollapsed: (isCollapsed) => set({ isChatHistoryCollapsed: isCollapsed }),

            toggleResearchHistory: () => set((state) => ({
                isResearchHistoryCollapsed: !state.isResearchHistoryCollapsed
            })),
            setResearchHistoryCollapsed: (isCollapsed) => set({ isResearchHistoryCollapsed: isCollapsed }),

            setActiveCase: (caseContainer) => set({
                activeCase: caseContainer,
                isTemporaryMode: caseContainer?.isTemporary ?? false
            }),

            setCases: (cases) => set({ cases }),

            startTemporaryCase: (details?: { title?: string; client?: string; legalSide?: "PROSECUTION" | "DEFENSE" | "CORPORATE" | "FINANCIAL" | "CIVIL" | "GENERAL"; jurisdiction?: { country: 'IN', state: string, city?: string } }) => set({
                isTemporaryMode: true,
                activeCase: {
                    id: `temp_${Date.now()}`,
                    title: details?.title || 'Temporary Guest Session',
                    client: details?.client || 'Guest Client',
                    status: 'DISCOVERY',
                    legalSide: details?.legalSide || 'PROSECUTION',
                    jurisdiction: details?.jurisdiction,
                    creatorUid: 'guest',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isTemporary: true
                }
            }),

            exitTemporaryCase: () => set({
                isTemporaryMode: false,
                activeCase: null
            }),

            setChatSessions: (sessions) => set({ chatSessions: sessions }),
            setActiveSessionId: (id) => set({ activeSessionId: id }),
        }),
        {
            name: 'poly-storage',
            partialize: (state) => ({
                role: state.role,
                isMainSidebarCollapsed: state.isMainSidebarCollapsed,
                isChatHistoryCollapsed: state.isChatHistoryCollapsed,
                isResearchHistoryCollapsed: state.isResearchHistoryCollapsed
            }), // Persist UI preferences
        }
    )
);
