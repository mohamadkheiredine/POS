import { store, persistor } from "@/store";
import { logout } from "@/store/slices/authSlice";

export function forceLogout(message?: string, redirectTo: string = "/login") {
  if (message) {
    alert(message);
  }

  store.dispatch(logout());
  persistor.purge();

  window.location.href = redirectTo;
}
