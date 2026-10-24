export type CustomerProfile = { id: string; name: string; cpf: string; email: string; phone: string; clientId: string | null; linkPending: boolean };
export type CatalogItem = { recommendation?: import("./recommendations").Recommendation; availabilityNote?: string; id: string; title: string; description: string; image: string; category: string; size: number; color: string; price: number | null; available: boolean; estimate: number | null };
export type Booking = { id: string; requestId: string | null; rentalId: string | null; itemTitle: string; image: string; start: string; end: string; status: string; stage: string; amount: number | null; paid: number; note: string | null; returned: boolean; events: { stage: string; message: string; at: string }[] };
export type CustomerData = {
  profile: CustomerProfile;
  bookings: Booking[];
  measurements: { id: string; at: string; values: Record<string, number> | null; description?: string }[];
  notifications: { id: string; title: string; message: string; at: string; read: boolean; requestId: string | null }[];
  unread: number;
};
export const stageLabels: Record<string, string> = { pending: 'Aguardando aprovação', confirmed: 'Reserva confirmada', scheduled: 'Reserva confirmada', awaiting_measurements: 'Aguardando medidas', preparing: 'Em preparação', ready: 'Pronto para retirada', out: 'Retirado', returned: 'Devolvido', rejected: 'Solicitação recusada', cancelled: 'Solicitação cancelada' };
