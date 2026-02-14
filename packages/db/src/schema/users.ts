export type UserRole = "admin" | "developer" | "viewer";

export interface User {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type NewUser = Omit<User, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};
