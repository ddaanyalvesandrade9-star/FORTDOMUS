const confirmationForm = document.querySelector("#lead-confirmation-form");
if (confirmationForm) {
  const submitButton = confirmationForm.querySelector("button");
  const feedback = document.querySelector("#lead-confirmation-feedback");
  const config = window.FORT_DOMUS_SUPABASE_CONFIG;
  const supabaseUrl = config?.url?.trim().replace(/\/+$/, "");
  const publishableKey = config?.publishableKey?.trim();
  const token = new URLSearchParams(location.search).get("token") || "";

  if (location.search) history.replaceState(null, "", location.pathname);
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token) || !supabaseUrl || !publishableKey) {
    submitButton.disabled = true;
    feedback.textContent = "Este link não está disponível. Solicite uma nova confirmação pelo site.";
  }

  confirmationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!token || !supabaseUrl || !publishableKey || submitButton.disabled) return;

    submitButton.disabled = true;
    feedback.textContent = "Confirmando sua autorização...";

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/confirm-lead`, {
        method: "POST",
        headers: {
          apikey: publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        feedback.textContent = result?.error
          || "Não foi possível confirmar. O link pode ter expirado ou já ter sido utilizado.";
        submitButton.disabled = false;
        return;
      }

      feedback.textContent = result?.message
        || "Número confirmado. A Fort Domus registrou sua autorização.";
    } catch {
      console.error("Erro de comunicação ao confirmar autorização.");
      feedback.textContent = "Não foi possível confirmar agora. Tente novamente mais tarde.";
      submitButton.disabled = false;
    }
  });
}
