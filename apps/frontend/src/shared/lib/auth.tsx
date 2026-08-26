import React, { createContext, useContext } from "react";
import { User } from "../types";

export interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>> | ((u: User | null | ((prev: User | null) => User | null)) => void);
  logout: () => Promise<void> | void;
  token?: string | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
