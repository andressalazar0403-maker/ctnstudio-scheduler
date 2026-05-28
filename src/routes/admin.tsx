import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyAdminStatus,
  adminListAppointments,
  adminCancelAppointment,
  adminCreateAppointment,
  adminMarkNoShow,
  adminListClients,
  adminSetClient,
  adminUpsertService,
  adminDeleteService,
  adminListBusinessHours,
  adminSetBusinessHours,
  adminMoveAppointment,
  adminListClientCards,
  adminUpsertClientCard,
  adminDeleteClientCard,
} from "@/lib/admin.functions";
import { listServices } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ArrowLeft,
  Plus,
  Trash2,
  XCircle,
  UserX,
  Unlock,
  Ban,
  ChevronLeft,
  ChevronRight,
  Euro,
  CalendarDays,
  Mail,
  Phone,
  Search,
  User as UserIcon,
  LogOut,
  MessageSquare,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — CTNSTUDIO" }] }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AdminPage,
});

function AdminPage() {
  const fetchStatus = useServerFn(getMyAdminStatus);
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => fetchStatus(),
  });

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  }

  if (isLoading) return <p className="p-8 text-muted-foreground">Comprobando acceso…</p>;
  if (!data?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center space-y-4">
          <Ban className="size-12 mx-auto text-destructive" />
          <h1 className="text-2xl font-black">Acceso denegado</h1>
          <p className="text-muted-foreground">Solo el jefe puede entrar aquí.</p>
          <Link to="/">
            <Button variant="outline">Volver al inicio</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-black tracking-widest">
            <Sparkles className="size-4" /> CTNSTUDIO · Admin
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="size-4" /> Volver
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="gap-2" onClick={logout}>
              <LogOut className="size-4" /> Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="calendario">
          <TabsList className="mb-6">
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="servicios">Servicios</TabsTrigger>
            <TabsTrigger value="horario">Horario</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
          </TabsList>
          <TabsContent value="calendario"><CalendarTab /></TabsContent>
          <TabsContent value="agenda"><AgendaTab /></TabsContent>
          <TabsContent value="servicios"><ServicesTab /></TabsContent>
          <TabsContent value="horario"><HoursTab /></TabsContent>
          <TabsContent value="clientes"><ClientsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------- Agenda ---------- */
function AgendaTab() {
  const qc = useQueryClient();
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const fetchList = useServerFn(adminListAppointments);
  const cancelFn = useServerFn(adminCancelAppointment);
  const noShowFn = useServerFn(adminMarkNoShow);

  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (range === "day") to.setDate(to.getDate() + 1);
  if (range === "week") to.setDate(to.getDate() + 7);
  if (range === "month") to.setDate(to.getDate() + 31);

  const { data: rows } = useQuery({
    queryKey: ["admin-appts", range],
    queryFn: () => fetchList({ data: { fromIso: from.toISOString(), toIso: to.toISOString() } }),
  });

  async function doCancel(id: string) {
    await cancelFn({ data: { id } });
    toast.success("Cancelada");
    qc.invalidateQueries({ queryKey: ["admin-appts"] });
  }
  async function doNoShow(id: string) {
    await noShowFn({ data: { id } });
    toast.success("Marcada como falta");
    qc.invalidateQueries({ queryKey: ["admin-appts"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["day", "week", "month"] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "outline"}
            onClick={() => setRange(r)}
          >
            {r === "day" ? "Hoy" : r === "week" ? "Semana" : "Mes"}
          </Button>
        ))}
      </div>
      {!rows?.length ? (
        <Card className="p-6 text-muted-foreground">Sin citas en este rango.</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => {
            const d = new Date(a.start_at);
            const svc = Array.isArray(a.services) ? a.services[0] : a.services;
            const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
            const who = a.client_name ?? p?.full_name ?? p?.email ?? "Cliente";
            const tel = a.client_phone ?? "";
            return (
              <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">
                    {d.toLocaleString("es-ES", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {svc?.name ?? "Servicio"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {who} {tel && `· ${tel}`} · {a.status}
                  </div>
                </div>
                {a.status === "scheduled" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => doNoShow(a.id)}>
                      <UserX className="size-4 mr-1" /> Falta
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive"
                      onClick={() => doCancel(a.id)}
                    >
                      <XCircle className="size-4 mr-1" /> Cancelar
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Nueva cita manual ---------- */
function NewAppointmentTab() {
  const qc = useQueryClient();
  const fetchServices = useServerFn(listServices);
  const createFn = useServerFn(adminCreateAppointment);
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: () => fetchServices() });

  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function submit() {
    if (!serviceId || !date || !time || !name || !phone) {
      toast.error("Completa todos los campos");
      return;
    }
    const iso = new Date(`${date}T${time}:00`).toISOString();
    try {
      await createFn({
        data: { serviceId, startAt: iso, clientName: name, clientPhone: phone },
      });
      toast.success("Cita creada");
      setName("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["admin-appts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <Card className="p-6 max-w-xl space-y-4">
      <div>
        <Label>Servicio</Label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full mt-1 p-2 rounded-md bg-input border border-border"
        >
          <option value="">— Elegir —</option>
          {(services ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration_minutes} min)
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Hora</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Nombre del cliente</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>
      <div>
        <Label>Teléfono</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
      </div>
      <Button onClick={submit} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
        <Plus className="size-4 mr-2" /> Crear cita
      </Button>
    </Card>
  );
}

/* ---------- Servicios ---------- */
function ServicesTab() {
  const qc = useQueryClient();
  const fetchServices = useServerFn(listServices);
  const upsertFn = useServerFn(adminUpsertService);
  const deleteFn = useServerFn(adminDeleteService);
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: () => fetchServices() });

  type Draft = {
    id?: string;
    slug: string;
    name: string;
    duration_minutes: number;
    price_cents: number;
    sort_order: number;
    color: string;
  };
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  function draft(s: { id: string; slug: string; name: string; duration_minutes: number; price_cents: number; sort_order: number; color?: string | null }): Draft {
    return drafts[s.id] ?? { ...s, color: s.color ?? "#a855f7" };
  }
  function patch(id: string, p: Partial<Draft>) {
    const found = services?.find((s) => s.id === id);
    const base = drafts[id] ?? (found ? { ...found, color: found.color ?? "#a855f7" } : undefined);
    if (!base) return;
    setDrafts((d) => ({ ...d, [id]: { ...base, ...p } }));
  }

  async function save(id: string) {
    const d = drafts[id];
    if (!d) return;
    await upsertFn({ data: d });
    toast.success("Guardado");
    setDrafts(({ [id]: _, ...rest }) => rest);
    qc.invalidateQueries({ queryKey: ["services"] });
  }
  async function remove(id: string) {
    if (!confirm("¿Borrar servicio?")) return;
    await deleteFn({ data: { id } });
    toast.success("Borrado");
    qc.invalidateQueries({ queryKey: ["services"] });
  }
  async function addNew() {
    const slug = prompt("Slug (minúsculas, sin espacios)");
    if (!slug) return;
    await upsertFn({
      data: {
        slug,
        name: "Nuevo servicio",
        duration_minutes: 30,
        price_cents: 1000,
        sort_order: (services?.length ?? 0) + 1,
        color: "#a855f7",
      },
    });
    toast.success("Creado");
    qc.invalidateQueries({ queryKey: ["services"] });
  }

  return (
    <div className="space-y-4">
      <Button onClick={addNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
        <Plus className="size-4 mr-2" /> Nuevo servicio
      </Button>
      <div className="space-y-3">
        {(services ?? []).map((s) => {
          const d = draft(s);
          const dirty = !!drafts[s.id];
          return (
            <Card key={s.id} className="p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
              <div className="sm:col-span-2">
                <Label>Nombre</Label>
                <Input value={d.name} onChange={(e) => patch(s.id, { name: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={d.slug} onChange={(e) => patch(s.id, { slug: e.target.value })} />
              </div>
              <div>
                <Label>Min</Label>
                <Input
                  type="number"
                  value={d.duration_minutes}
                  onChange={(e) => patch(s.id, { duration_minutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Precio €</Label>
                <Input
                  type="number"
                  step="0.50"
                  value={(d.price_cents / 100).toFixed(2)}
                  onChange={(e) => patch(s.id, { price_cents: Math.round(Number(e.target.value) * 100) })}
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Color</span>
                  <input
                    type="color"
                    value={d.color}
                    onChange={(e) => patch(s.id, { color: e.target.value })}
                    className="h-9 w-9 rounded cursor-pointer border border-border bg-transparent"
                  />
                </label>
                <Button size="sm" disabled={!dirty} onClick={() => save(s.id)}>
                  Guardar
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(s.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Horario ---------- */
function HoursTab() {
  const qc = useQueryClient();
  const fetchHours = useServerFn(adminListBusinessHours);
  const setHours = useServerFn(adminSetBusinessHours);
  const { data: hours } = useQuery({ queryKey: ["admin-hours"], queryFn: () => fetchHours() });

  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  async function update(
    day_of_week: number,
    patch: { open_time?: string; close_time?: string; closed?: boolean },
  ) {
    const row = hours?.find((h) => h.day_of_week === day_of_week);
    if (!row) return;
    await setHours({
      data: {
        day_of_week,
        open_time: (patch.open_time ?? row.open_time).slice(0, 5),
        close_time: (patch.close_time ?? row.close_time).slice(0, 5),
        closed: patch.closed ?? row.closed,
      },
    });
    qc.invalidateQueries({ queryKey: ["admin-hours"] });
  }

  return (
    <div className="space-y-2 max-w-2xl">
      <p className="text-sm text-muted-foreground mb-4">
        Activa los días que trabajas y elige horario. Si está cerrado, no aparecen huecos.
      </p>
      {(hours ?? []).map((h) => (
        <Card key={h.day_of_week} className="p-4 grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
          <div className="font-bold">{dayNames[h.day_of_week]}</div>
          <div className="flex items-center gap-2">
            <Switch
              checked={!h.closed}
              onCheckedChange={(v) => update(h.day_of_week, { closed: !v })}
            />
            <span className="text-sm text-muted-foreground">{h.closed ? "Cerrado" : "Abierto"}</span>
          </div>
          <Input
            type="time"
            value={h.open_time?.slice(0, 5) ?? ""}
            disabled={h.closed}
            onChange={(e) => update(h.day_of_week, { open_time: e.target.value })}
          />
          <Input
            type="time"
            value={h.close_time?.slice(0, 5) ?? ""}
            disabled={h.closed}
            onChange={(e) => update(h.day_of_week, { close_time: e.target.value })}
          />
        </Card>
      ))}
    </div>
  );
}

/* ---------- Clientes ---------- */
function ClientsTab() {
  const qc = useQueryClient();
  const fetchClients = useServerFn(adminListClients);
  const setClient = useServerFn(adminSetClient);
  const fetchCards = useServerFn(adminListClientCards);
  const upsertCard = useServerFn(adminUpsertClientCard);
  const deleteCard = useServerFn(adminDeleteClientCard);

  const { data: clients } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: () => fetchClients(),
  });
  const { data: cards } = useQuery({
    queryKey: ["admin-client-cards"],
    queryFn: () => fetchCards(),
  });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<null | { id?: string; name: string; email: string; phone: string; notes: string }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { id: string; name: string }>(null);

  const filteredCards = (cards ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    );
  });

  async function toggleBlock(id: string, blocked: boolean) {
    await setClient({ data: { userId: id, blocked: !blocked, no_show_count: blocked ? 0 : undefined } });
    toast.success(blocked ? "Desbloqueado" : "Bloqueado");
    qc.invalidateQueries({ queryKey: ["admin-clients"] });
  }
  async function reset(id: string) {
    await setClient({ data: { userId: id, no_show_count: 0, blocked: false } });
    toast.success("Contador reseteado");
    qc.invalidateQueries({ queryKey: ["admin-clients"] });
  }

  async function saveCard() {
    if (!editing || !editing.name.trim()) {
      toast.error("Nombre obligatorio");
      return;
    }
    await upsertCard({
      data: {
        id: editing.id,
        name: editing.name.trim(),
        email: editing.email.trim() || null,
        phone: editing.phone.trim() || null,
        notes: editing.notes.trim() || null,
      },
    });
    toast.success("Ficha guardada");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-client-cards"] });
  }

  async function doDeleteCard() {
    if (!confirmDelete) return;
    await deleteCard({ data: { id: confirmDelete.id } });
    toast.success("Cliente eliminado");
    setConfirmDelete(null);
    qc.invalidateQueries({ queryKey: ["admin-client-cards"] });
  }

  return (
    <div className="space-y-8">
      {/* Fichas de cliente del jefe */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-black">Fichas de cliente</h3>
          <Button
            size="sm"
            onClick={() => setEditing({ name: "", email: "", phone: "", notes: "" })}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="size-4 mr-1" /> Nueva ficha
          </Button>
        </div>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo o WhatsApp…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {!filteredCards.length ? (
          <Card className="p-6 text-muted-foreground">Sin fichas todavía.</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCards.map((c) => (
              <Card key={c.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <UserIcon className="size-4 text-primary" />
                    {c.name}
                  </div>
                  {c.email && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="size-3" /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3" /> {c.phone}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditing({
                        id: c.id,
                        name: c.name,
                        email: c.email ?? "",
                        phone: c.phone ?? "",
                        notes: c.notes ?? "",
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive/80 border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmDelete({ id: c.id, name: c.name })}
                  >
                    <Trash2 className="size-3 mr-1" /> Eliminar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Usuarios registrados */}
      <div className="space-y-2">
        <h3 className="text-xl font-black">Usuarios registrados</h3>
      {!clients?.length && <Card className="p-6 text-muted-foreground">Sin clientes todavía.</Card>}
      {(clients ?? []).map((c) => (
        <Card key={c.id} className="p-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">{c.full_name ?? c.email}</div>
            <div className="text-sm text-muted-foreground">
              {c.email} · Faltas: {c.no_show_count}
              {c.blocked && <span className="text-destructive ml-2 font-bold">BLOQUEADO</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => reset(c.id)}>
              Resetear
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleBlock(c.id, c.blocked)}
              className={c.blocked ? "border-primary text-primary" : "border-destructive/40 text-destructive"}
            >
              {c.blocked ? <Unlock className="size-4 mr-1" /> : <Ban className="size-4 mr-1" />}
              {c.blocked ? "Desbloquear" : "Bloquear"}
            </Button>
          </div>
        </Card>
      ))}
      </div>

      {/* Diálogo editar ficha */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar ficha" : "Nueva ficha"}</DialogTitle>
            <DialogDescription>Guarda los datos del cliente para reservas futuras.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={120} />
              </div>
              <div>
                <Label>Correo</Label>
                <Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} maxLength={160} />
              </div>
              <div>
                <Label>WhatsApp / Teléfono</Label>
                <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} maxLength={40} />
              </div>
              <div>
                <Label>Notas</Label>
                <Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} maxLength={2000} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveCard} className="bg-accent text-accent-foreground hover:bg-accent/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación eliminar */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La ficha del cliente se borrará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

