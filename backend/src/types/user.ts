// le type qu'on renvoie au front via /api/auth/me
// doit correspondre a l'interface User dans frontend/src/providers/AuthProvider.tsx
export interface UserResponse {
  id: number;
  login: string;
  email: string;
  fortyTwoId: number | null;
}