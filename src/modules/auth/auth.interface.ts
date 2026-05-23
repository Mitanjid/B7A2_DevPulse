import type { TRole } from "../../types";


export interface ISignupPayload {
  name: string;
  email: string;
  password: string;
  role?: TRole;
}

export interface ILoginPayload {
  email: string;
  password: string;
}
