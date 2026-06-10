import { createContext, type ReactNode, useContext } from "react";
import type { AuthUser } from "../structure/types";

const AuthUserContext = createContext<AuthUser | null>(null);

interface AuthUserProviderProps {
	user: AuthUser | null;
	children: ReactNode;
}

/** Hydrated from Inertia shared props (`auth.user`) by AdminPage. */
export function AuthUserProvider({ user, children }: AuthUserProviderProps) {
	return <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>;
}

export function useAuthUser(): AuthUser | null {
	return useContext(AuthUserContext);
}
