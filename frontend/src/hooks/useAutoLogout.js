import { useEffect } from "react";

export default function useAutoLogout(logout, activo = true) {
  useEffect(() => {
    if (!activo) return;

    if (typeof logout !== "function") {
      console.warn("useAutoLogout: logout no es una función");
      return;
    }

    const TIEMPO_INACTIVIDAD = 30 * 60 * 1000;

    let timeout;

    const reiniciarTemporizador = () => {
      clearTimeout(timeout);

      timeout = setTimeout(async () => {
        await logout();

        alert("La sesión fue cerrada por inactividad.");

        window.location.href = "/";
      }, TIEMPO_INACTIVIDAD);
    };

    const eventos = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    eventos.forEach((evento) => {
      window.addEventListener(evento, reiniciarTemporizador);
    });

    reiniciarTemporizador();

    return () => {
      clearTimeout(timeout);

      eventos.forEach((evento) => {
        window.removeEventListener(evento, reiniciarTemporizador);
      });
    };
  }, [logout, activo]);
}