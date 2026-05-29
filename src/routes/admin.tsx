import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
  const { user, loading: authLoading } = useAuth();
  const canCheckAdmin = !authLoading && !!user;
  const { data, isLoading } = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => fetchStatus(),
    enabled: canCheckAdmin,
    retry: false,
  });

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  }

  if (authLoading || (canCheckAdmin && isLoading)) return <p className="p-8 text-muted-foreground">Comprobando acceso…</p>;
  if (!user) return <p className="p-8 text-muted-foreground">Redirigiendo al login…</p>;
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
    retry: false,
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
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: () => fetchServices(), retry: false });

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
  const { data: hours } = useQuery({ queryKey: ["admin-hours"], queryFn: () => fetchHours(), retry: false });

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
    retry: false,
  });
  const { data: cards } = useQuery({
    queryKey: ["admin-client-cards"],
    queryFn: () => fetchCards(),
    retry: false,
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

/* ---------- Calendario visual estilo Booksy ---------- */
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21;
const PX_PER_MIN = 1.6; // 96px por hora
const SLOT_MIN = 30;
const TOTAL_DAY_PX = (DAY_END_HOUR - DAY_START_HOUR) * 60 * PX_PER_MIN;

function fmtEuro(cents: number) {
  return `${(cents / 100).toFixed(2)}€`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0 dom .. 6 sab
  const diff = dow === 0 ? -6 : 1 - dow; // lunes como inicio
  x.setDate(x.getDate() + diff);
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type View = "day" | "week" | "month";
type Appt = Awaited<ReturnType<typeof import("@/lib/admin.functions")["adminListAppointments"]>>[number];

function CalendarTab() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [newSlot, setNewSlot] = useState<Date | null>(null);
  const [detail, setDetail] = useState<Appt | null>(null);

  // Aguja horaria en vivo
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Realtime: nuevas citas mientras el panel está abierto
  useEffect(() => {
    const channel = supabase
      .channel("admin-appts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        () => {
          toast.success("Nueva cita recibida");
          qc.invalidateQueries({ queryKey: ["admin-cal"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Atajos de teclado: ←/→ navegan, Hoy con T
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") shift(-1);
      else if (e.key === "ArrowRight") shift(1);
      else if (e.key === "t" || e.key === "T") gotoToday();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor]);

  const fetchList = useServerFn(adminListAppointments);
  const fetchServices = useServerFn(listServices);
  const fetchCards = useServerFn(adminListClientCards);
  const createFn = useServerFn(adminCreateAppointment);
  const cancelFn = useServerFn(adminCancelAppointment);
  const noShowFn = useServerFn(adminMarkNoShow);
  const moveFn = useServerFn(adminMoveAppointment);

  // Rango según vista
  const range = (() => {
    if (view === "day") return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) };
    if (view === "week") {
      const f = startOfWeek(anchor);
      return { from: f, to: addDays(f, 7) };
    }
    const f = startOfMonth(anchor);
    return { from: f, to: addMonths(f, 1) };
  })();

  const { data: rows } = useQuery({
    queryKey: ["admin-cal", view, range.from.toISOString()],
    queryFn: () =>
      fetchList({ data: { fromIso: range.from.toISOString(), toIso: range.to.toISOString() } }),
    retry: false,
  });
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: () => fetchServices(), retry: false });
  const { data: cards } = useQuery({ queryKey: ["admin-client-cards"], queryFn: () => fetchCards(), retry: false });

  const scheduled = (rows ?? []).filter((a) => a.status === "scheduled");
  const totalCents = scheduled.reduce((acc, a) => {
    const svc = Array.isArray(a.services) ? a.services[0] : a.services;
    return acc + (svc?.price_cents ?? 0);
  }, 0);

  function shift(delta: number) {
    if (view === "day") setAnchor(addDays(anchor, delta));
    else if (view === "week") setAnchor(addDays(anchor, delta * 7));
    else setAnchor(addMonths(anchor, delta));
  }
  function gotoToday() {
    setAnchor(startOfDay(new Date()));
  }

  async function doCancel(id: string) {
    await cancelFn({ data: { id } });
    toast.success("Cancelada");
    setDetail(null);
    qc.invalidateQueries({ queryKey: ["admin-cal"] });
  }
  async function doNoShow(id: string) {
    await noShowFn({ data: { id } });
    toast.success("Falta registrada");
    setDetail(null);
    qc.invalidateQueries({ queryKey: ["admin-cal"] });
  }
  async function doMove(id: string, newStart: Date) {
    try {
      await moveFn({ data: { id, startAt: newStart.toISOString() } });
      toast.success("Cita movida");
      qc.invalidateQueries({ queryKey: ["admin-cal"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  const headerLabel = (() => {
    if (view === "day")
      return anchor.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    if (view === "week") {
      const f = startOfWeek(anchor);
      const l = addDays(f, 6);
      return `${f.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${l.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  })();

  return (
    <div className="space-y-6">
      {/* Header navegación + finanzas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-br from-card to-card/40">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {view === "day" ? "Día" : view === "week" ? "Semana" : "Mes"}
            </div>
            <div className="text-2xl font-black capitalize">{headerLabel}</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-md overflow-hidden border border-border">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors",
                    view === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => shift(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={gotoToday}>
              <CalendarDays className="size-4 mr-1" /> Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => shift(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </Card>
        <Card
          className="p-5 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(255,115,0,0.18))",
            borderColor: "rgba(168,85,247,0.35)",
          }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Total cotizado
            </div>
            <div className="text-3xl font-black">{fmtEuro(totalCents)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {scheduled.length} cita{scheduled.length === 1 ? "" : "s"} confirmadas
            </div>
          </div>
          <Euro className="size-10 text-accent opacity-70" />
        </Card>
      </div>

      {/* Vista */}
      {view === "day" && (
        <DayGrid
          day={anchor}
          appts={scheduled}
          now={now}
          onSlot={(d) => setNewSlot(d)}
          onClickAppt={(a) => setDetail(a)}
          onDropAppt={(id, d) => doMove(id, d)}
        />
      )}
      {view === "week" && (
        <WeekGrid
          weekStart={startOfWeek(anchor)}
          appts={scheduled}
          now={now}
          onSlot={(d) => setNewSlot(d)}
          onClickAppt={(a) => setDetail(a)}
          onDropAppt={(id, d) => doMove(id, d)}
        />
      )}
      {view === "month" && (
        <MonthGrid
          monthStart={startOfMonth(anchor)}
          appts={scheduled}
          onPickDay={(d) => {
            setAnchor(d);
            setView("day");
          }}
        />
      )}

      {/* Diálogo: nueva cita */}
      <NewAppointmentDialog
        open={!!newSlot}
        slot={newSlot}
        services={services ?? []}
        cards={cards ?? []}
        onClose={() => setNewSlot(null)}
        onCreate={async ({ serviceId, name, phone, email, startAt }) => {
          try {
            await createFn({
              data: {
                serviceId,
                startAt,
                clientName: name,
                clientPhone: phone,
                clientEmail: email || null,
              },
            });
            toast.success("Cita creada");
            setNewSlot(null);
            qc.invalidateQueries({ queryKey: ["admin-cal"] });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error");
          }
        }}
      />

      {/* Modal de detalle */}
      <ApptDetailDialog
        appt={detail}
        onClose={() => setDetail(null)}
        onCancel={doCancel}
        onNoShow={doNoShow}
      />
    </div>
  );
}

/* ---------- Día ---------- */
function topForTime(t: Date) {
  const mins = (t.getHours() - DAY_START_HOUR) * 60 + t.getMinutes();
  return mins * PX_PER_MIN;
}

function buildSlots(day: Date): Date[] {
  const slots: Date[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MIN) {
      const d = new Date(day);
      d.setHours(h, m, 0, 0);
      slots.push(d);
    }
  }
  return slots;
}

const COLOR_FALLBACK = [
  "from-purple-500/80 to-purple-700/80 border-purple-300/40",
  "from-orange-500/80 to-orange-700/80 border-orange-300/40",
  "from-emerald-500/80 to-emerald-700/80 border-emerald-300/40",
  "from-sky-500/80 to-sky-700/80 border-sky-300/40",
  "from-pink-500/80 to-pink-700/80 border-pink-300/40",
];

function NowNeedle({ now, day }: { now: Date; day: Date }) {
  if (!sameDay(now, day)) return null;
  const h = now.getHours();
  if (h < DAY_START_HOUR || h >= DAY_END_HOUR) return null;
  const top = topForTime(now);
  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top }}
    >
      <div className="relative h-px" style={{ background: "#ff3366", boxShadow: "0 0 8px #ff3366" }}>
        <span
          className="absolute -top-2 -left-1 size-3 rounded-full"
          style={{ background: "#ff3366", boxShadow: "0 0 6px #ff3366" }}
        />
        <span
          className="absolute -top-2.5 right-2 text-[10px] font-black px-1.5 py-0.5 rounded"
          style={{ background: "#ff3366", color: "#fff" }}
        >
          {now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function ApptBlock({
  a,
  i,
  onClick,
}: {
  a: Appt;
  i: number;
  onClick: () => void;
}) {
  const start = new Date(a.start_at);
  const end = new Date(a.end_at);
  const top = topForTime(start);
  const height = Math.max(30, ((end.getTime() - start.getTime()) / 60_000) * PX_PER_MIN);
  const svc = Array.isArray(a.services) ? a.services[0] : a.services;
  const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
  const who = a.client_name ?? p?.full_name ?? p?.email ?? "Cliente";
  const customColor = svc?.color;
  const gradientClass = customColor ? "" : COLOR_FALLBACK[i % COLOR_FALLBACK.length];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/appt-id", a.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className={cn(
        "absolute left-1 right-1 rounded-xl border p-2 text-white shadow-lg overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform z-10",
        customColor ? "" : "bg-gradient-to-br",
        gradientClass,
      )}
      style={{
        top: top + 1,
        height: height - 2,
        ...(customColor
          ? {
              background: `linear-gradient(135deg, ${customColor}cc, ${customColor}88)`,
              borderColor: `${customColor}66`,
            }
          : {}),
      }}
    >
      <div className="text-[10px] font-bold opacity-90">
        {start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="text-xs font-black truncate">{svc?.name ?? "Servicio"}</div>
      <div className="text-[11px] truncate opacity-90">{who}</div>
    </div>
  );
}

function DayGrid({
  day,
  appts,
  now,
  onSlot,
  onClickAppt,
  onDropAppt,
}: {
  day: Date;
  appts: Appt[];
  now: Date;
  onSlot: (d: Date) => void;
  onClickAppt: (a: Appt) => void;
  onDropAppt: (id: string, d: Date) => void;
}) {
  const slots = buildSlots(day);
  return (
    <Card className="overflow-hidden">
      <div className="relative flex">
        <div className="w-20 border-r border-border/60 bg-card/40 shrink-0">
          {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => {
            const h = DAY_START_HOUR + i;
            return (
              <div
                key={h}
                className="text-xs text-muted-foreground px-3 pt-1 font-bold"
                style={{ height: 60 * PX_PER_MIN }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            );
          })}
        </div>
        <div className="relative flex-1">
          {slots.map((s) => (
            <button
              key={s.toISOString()}
              onClick={() => onSlot(s)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/appt-id");
                if (id) onDropAppt(id, s);
              }}
              className="absolute left-0 right-0 border-t border-border/30 hover:bg-primary/10 transition-colors group"
              style={{ top: topForTime(s), height: SLOT_MIN * PX_PER_MIN }}
            >
              <span className="absolute right-2 top-1 text-[10px] uppercase tracking-widest text-muted-foreground opacity-0 group-hover:opacity-100">
                + Nueva
              </span>
            </button>
          ))}
          {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-border/60 pointer-events-none"
              style={{ top: i * 60 * PX_PER_MIN }}
            />
          ))}
          {appts.map((a, i) => (
            <ApptBlock key={a.id} a={a} i={i} onClick={() => onClickAppt(a)} />
          ))}
          <NowNeedle now={now} day={day} />
          <div style={{ height: TOTAL_DAY_PX }} />
        </div>
      </div>
    </Card>
  );
}

/* ---------- Semana ---------- */
function WeekGrid({
  weekStart,
  appts,
  now,
  onSlot,
  onClickAppt,
  onDropAppt,
}: {
  weekStart: Date;
  appts: Appt[];
  now: Date;
  onSlot: (d: Date) => void;
  onClickAppt: (a: Appt) => void;
  onDropAppt: (id: string, d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div className="w-14 shrink-0 border-r border-border/60 bg-card/40">
          <div className="h-10 border-b border-border/60" />
          {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => {
            const h = DAY_START_HOUR + i;
            return (
              <div
                key={h}
                className="text-[10px] text-muted-foreground px-2 pt-1 font-bold"
                style={{ height: 60 * PX_PER_MIN }}
              >
                {String(h).padStart(2, "0")}
              </div>
            );
          })}
        </div>
        <div className="flex-1 grid grid-cols-7">
          {days.map((d) => {
            const dayAppts = appts.filter((a) => sameDay(new Date(a.start_at), d));
            const isToday = sameDay(d, now);
            return (
              <div key={d.toISOString()} className="relative border-r border-border/60 last:border-r-0">
                <div
                  className={cn(
                    "h-10 border-b border-border/60 px-2 py-1 text-center",
                    isToday && "bg-primary/15",
                  )}
                >
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {d.toLocaleDateString("es-ES", { weekday: "short" })}
                  </div>
                  <div className={cn("text-sm font-black leading-none", isToday && "text-primary")}>
                    {d.getDate()}
                  </div>
                </div>
                <div className="relative" style={{ height: TOTAL_DAY_PX }}>
                  {buildSlots(d).map((s) => (
                    <button
                      key={s.toISOString()}
                      onClick={() => onSlot(s)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("text/appt-id");
                        if (id) onDropAppt(id, s);
                      }}
                      className="absolute left-0 right-0 border-t border-border/20 hover:bg-primary/10"
                      style={{ top: topForTime(s), height: SLOT_MIN * PX_PER_MIN }}
                    />
                  ))}
                  {dayAppts.map((a, i) => (
                    <ApptBlock key={a.id} a={a} i={i} onClick={() => onClickAppt(a)} />
                  ))}
                  <NowNeedle now={now} day={d} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Mes ---------- */
function MonthGrid({
  monthStart,
  appts,
  onPickDay,
}: {
  monthStart: Date;
  appts: Appt[];
  onPickDay: (d: Date) => void;
}) {
  const first = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const today = startOfDay(new Date());
  const monthIdx = monthStart.getMonth();
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/60">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="py-2 font-bold">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const dayAppts = appts.filter((a) => sameDay(new Date(a.start_at), d));
          const isCurMonth = d.getMonth() === monthIdx;
          const isToday = sameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPickDay(d)}
              className={cn(
                "h-24 border-b border-r border-border/40 p-2 text-left transition-colors hover:bg-primary/10",
                !isCurMonth && "opacity-40",
                isToday && "bg-primary/10",
              )}
            >
              <div className={cn("text-sm font-black", isToday && "text-primary")}>
                {d.getDate()}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayAppts.slice(0, 3).map((a) => {
                  const svc = Array.isArray(a.services) ? a.services[0] : a.services;
                  return (
                    <div
                      key={a.id}
                      className="text-[10px] truncate px-1 rounded text-white"
                      style={{ background: svc?.color ?? "#a855f7" }}
                    >
                      {new Date(a.start_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      {svc?.name ?? ""}
                    </div>
                  );
                })}
                {dayAppts.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{dayAppts.length - 3} más</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Modal detalle de cita ---------- */
function ApptDetailDialog({
  appt,
  onClose,
  onCancel,
  onNoShow,
}: {
  appt: Appt | null;
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
  onNoShow: (id: string) => Promise<void>;
}) {
  if (!appt) {
    return (
      <Dialog open={false} onOpenChange={() => onClose()}>
        <DialogContent />
      </Dialog>
    );
  }
  const svc = Array.isArray(appt.services) ? appt.services[0] : appt.services;
  const p = Array.isArray(appt.profiles) ? appt.profiles[0] : appt.profiles;
  const name = appt.client_name ?? p?.full_name ?? "Cliente";
  const email = appt.client_email ?? p?.email ?? "";
  const phone = appt.client_phone ?? "";
  const start = new Date(appt.start_at);
  const end = new Date(appt.end_at);
  const waNumber = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="size-3 rounded-full"
              style={{ background: svc?.color ?? "#a855f7" }}
            />
            {svc?.name ?? "Servicio"}
          </DialogTitle>
          <DialogDescription>
            {start.toLocaleString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            – {end.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            {svc?.price_cents != null && <> · {fmtEuro(svc.price_cents)}</>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="size-4 text-primary" />
            <span className="font-bold">{name}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground" />
              <a href={`tel:${phone}`} className="hover:text-primary">
                {phone}
              </a>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <a href={`mailto:${email}`} className="hover:text-primary truncate">
                {email}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3" /> Estado: {appt.status}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              <MessageSquare className="size-4" /> WhatsApp
            </a>
          )}
          {appt.status === "scheduled" && (
            <>
              <Button variant="outline" size="sm" onClick={() => onNoShow(appt.id)}>
                <UserX className="size-4 mr-1" /> Falta
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive"
                onClick={() => onCancel(appt.id)}
              >
                <XCircle className="size-4 mr-1" /> Cancelar
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Nueva cita con autocomplete ---------- */
type CardOption = { id: string; name: string; email: string | null; phone: string | null };

function NewAppointmentDialog({
  open,
  slot,
  services,
  cards,
  onClose,
  onCreate,
}: {
  open: boolean;
  slot: Date | null;
  services: { id: string; name: string; duration_minutes: number; price_cents: number }[];
  cards: CardOption[];
  onClose: () => void;
  onCreate: (v: {
    serviceId: string;
    name: string;
    phone: string;
    email: string;
    startAt: string;
  }) => Promise<void>;
}) {
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openSuggest, setOpenSuggest] = useState(false);

  useEffect(() => {
    if (!open) {
      setServiceId("");
      setName("");
      setPhone("");
      setEmail("");
      setOpenSuggest(false);
    }
  }, [open]);

  const matches = (() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return cards
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  })();

  function pick(c: CardOption) {
    setName(c.name);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setOpenSuggest(false);
  }

  async function submit() {
    if (!slot || !serviceId || !name || !phone) {
      toast.error("Completa servicio, nombre y teléfono");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({ serviceId, name, phone, email, startAt: slot.toISOString() });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Nueva cita ·{" "}
            {slot?.toLocaleString("es-ES", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </DialogTitle>
          <DialogDescription>
            Empieza a escribir el nombre y elige un cliente existente para autocompletar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Servicio</Label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full mt-1 p-2 rounded-md bg-input border border-border"
            >
              <option value="">— Elegir —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_minutes}min · {fmtEuro(s.price_cents)}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setOpenSuggest(true);
              }}
              onFocus={() => setOpenSuggest(true)}
              onBlur={() => setTimeout(() => setOpenSuggest(false), 150)}
              maxLength={120}
              placeholder="Escribe para buscar…"
            />
            {openSuggest && matches.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-xl overflow-hidden">
                {matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(c)}
                    className="w-full text-left px-3 py-2 hover:bg-primary/10 border-b border-border/40 last:border-b-0"
                  >
                    <div className="text-sm font-bold flex items-center gap-2">
                      <UserIcon className="size-3 text-primary" /> {c.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {[c.phone, c.email].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Teléfono / WhatsApp</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
            </div>
            <div>
              <Label>Correo (opcional)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={160}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="size-4 mr-1" /> Crear cita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
