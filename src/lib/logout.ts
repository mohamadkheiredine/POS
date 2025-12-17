export function forceLogout(message?: string) {
  if (message) {
    alert(message);
  }

  localStorage.removeItem("access_token");
  localStorage.removeItem("g_hash");
  localStorage.removeItem("user_id");
  
  window.location.href = "/login";
}
