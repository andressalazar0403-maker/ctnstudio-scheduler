/**
 * Número del barbero en formato internacional sin "+", solo dígitos.
 * Ejemplo: España "34600111222". Editar aquí actualiza WhatsApp y llamadas.
 */
export const BARBER_PHONE = "34600000000";

export const waLink = (text: string) =>
  `https://wa.me/${BARBER_PHONE}?text=${encodeURIComponent(text)}`;

export const telLink = `tel:+${BARBER_PHONE}`;