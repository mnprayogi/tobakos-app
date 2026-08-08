"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  createFarmer,
  updateFarmer,
  deleteFarmer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createTobaccoType,
  updateTobaccoType,
  toggleTobaccoType,
  createLeafType,
  updateLeafType,
  toggleLeafType,
  createPackingType,
  updatePackingType,
  deletePackingType,
  createGrade,
  updateGrade,
  deleteGrade,
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/actions/admin"
import {
  createWarehouse,
  updateWarehouse,
  toggleWarehouse,
  deleteWarehouse,
  createLane,
  updateLane,
  toggleLane,
  deleteLane,
} from "@/lib/actions/lanes"
import { formatCurrency } from "@/lib/utils"
import {
  Database,
  Users,
  Leaf,
  Package,
  Award,
  Building2,
  Warehouse,
  Waypoints,
  Store,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"

interface Farmer { id: number; name: string; nik: string | null; phone: string | null; address: string | null }
interface Customer { id: number; name: string; phone: string | null; address: string | null }
interface TobaccoType { id: number; name: string; active: boolean; grades: { id: number; name: string }[] }
interface LeafType { id: number; name: string; active: boolean }
interface PackingType { id: number; name: string; deductionWeight: number }
interface Grade { id: number; name: string; defaultPrice: number; tobaccoTypeId: number; tobaccoType: { id: number; name: string } }
interface User {
  id: string
  name: string | null
  username: string | null
  email: string | null
  role: string
  laneId: number | null
  lane: {
    id: number
    code: string
    name: string
    warehouse: { id: number; code: string; name: string }
  } | null
}
interface WarehouseData { id: number; code: string; name: string; address: string | null; active: boolean }
interface LaneData { id: number; code: string; name: string; warehouseId: number; active: boolean; warehouse: { id: number; code: string; name: string } }

interface Props {
  farmers: Farmer[]
  tobaccoTypes: TobaccoType[]
  leafTypes: LeafType[]
  packingTypes: PackingType[]
  grades: Grade[]
  users: User[]
  warehouses: WarehouseData[]
  lanes: LaneData[]
  customers: Customer[]
}

type TabId = "petani" | "tembakau" | "daun" | "packing" | "grade" | "gudang" | "jalur" | "users" | "customer"

const tabs: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "petani", label: "Petani", icon: Users },
  { id: "customer", label: "Customer", icon: Store },
  { id: "tembakau", label: "Jenis Tembakau", icon: Leaf },
  { id: "daun", label: "Jenis Daun", icon: Leaf },
  { id: "packing", label: "Jenis Packing", icon: Package },
  { id: "grade", label: "Grade Tembakau", icon: Award },
  { id: "gudang", label: "Gudang", icon: Warehouse },
  { id: "jalur", label: "Jalur", icon: Waypoints },
  { id: "users", label: "Users", icon: Building2 },
]

export function MasterDataClient(props: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("petani")

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Database}
        title="Manajemen Master Data"
        subtitle="Kelola Petani, Jenis Tembakau, Jenis Daun, Packing, Grade, Gudang, Jalur & Users"
      />

      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-emerald text-primary-foreground shadow-sm"
                  : "bg-panel-alt text-foreground/65 hover:text-foreground hover:bg-panel border border-border"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === "petani" && <FarmersTab farmers={props.farmers} />}
      {activeTab === "customer" && <CustomersTab customers={props.customers} />}
      {activeTab === "tembakau" && <TobaccoTypesTab types={props.tobaccoTypes} />}
      {activeTab === "daun" && <LeafTypesTab types={props.leafTypes} />}
      {activeTab === "packing" && <PackingTypesTab types={props.packingTypes} />}
      {activeTab === "grade" && <GradesTab grades={props.grades} tobaccoTypes={props.tobaccoTypes} />}
      {activeTab === "gudang" && <WarehousesTab warehouses={props.warehouses} />}
      {activeTab === "jalur" && <LanesTab lanes={props.lanes} warehouses={props.warehouses} />}
      {activeTab === "users" && <UsersTab users={props.users} lanes={props.lanes} />}
    </div>
  )
}

function FarmersTab({ farmers: initial }: { farmers: Farmer[] }) {
  const [list, setList] = useState(initial)
  const [nama, setNama] = useState("")
  const [nik, setNik] = useState("")
  const [telepon, setTelepon] = useState("")
  const [alamat, setAlamat] = useState("")
  const [editing, setEditing] = useState<Farmer | null>(null)

  function resetForm() { setNama(""); setNik(""); setTelepon(""); setAlamat(""); setEditing(null) }

  function startEdit(f: Farmer) {
    setEditing(f); setNama(f.name); setNik(f.nik ?? ""); setTelepon(f.phone ?? ""); setAlamat(f.address ?? ""); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) { toast.error("Nama petani harus diisi"); return }
    try {
      if (editing) {
        const updated = await updateFarmer(editing.id, { name: nama, nik: nik || undefined, phone: telepon || undefined, address: alamat || undefined })
        setList((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)))
        toast.success("Petani diperbarui")
      } else {
        const created = await createFarmer({ name: nama, nik: nik || undefined, phone: telepon || undefined, address: alamat || undefined })
        setList((prev) => [created, ...prev])
        toast.success("Petani ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus petani ini?")) return
    try {
      await deleteFarmer(id)
      setList((prev) => prev.filter((f) => f.id !== id))
      toast.success("Petani dihapus")
      if (editing?.id === id) resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit Petani" : "Tambah Petani Baru"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama Lengkap *</label>
          <input type="text" required placeholder="Pak Supardi" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">NIK / KTP</label>
          <input type="text" placeholder="3323011208750001" value={nik} onChange={(e) => setNik(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-mono rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Telepon</label>
          <input type="text" placeholder="0812-3456-7890" value={telepon} onChange={(e) => setTelepon(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Alamat</label>
          <textarea placeholder="Dusun Wonosari, Temanggung" value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={2}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none resize-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Simpan Petani"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Petani ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((f) => (
            <div key={f.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-start text-xs gap-2">
              <div className="min-w-0">
                <span className="font-bold text-foreground text-sm">{f.name}</span>
                <div className="text-muted-foreground font-mono text-[11px] mt-0.5">
                  {f.nik ? `NIK: ${f.nik}` : "—"} {f.phone && `• ${f.phone}`}
                </div>
                {f.address && <div className="text-muted-2 text-[11px] mt-0.5">{f.address}</div>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <button type="button" onClick={() => startEdit(f)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleDelete(f.id)} className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data petani.</p>}
        </div>
      </div>
    </div>
  )
}

function CustomersTab({ customers: initial }: { customers: Customer[] }) {
  const [list, setList] = useState(initial)
  const [nama, setNama] = useState("")
  const [telepon, setTelepon] = useState("")
  const [alamat, setAlamat] = useState("")
  const [editing, setEditing] = useState<Customer | null>(null)

  function resetForm() { setNama(""); setTelepon(""); setAlamat(""); setEditing(null) }

  function startEdit(c: Customer) {
    setEditing(c); setNama(c.name); setTelepon(c.phone ?? ""); setAlamat(c.address ?? ""); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) { toast.error("Nama customer harus diisi"); return }
    try {
      if (editing) {
        const updated = await updateCustomer(editing.id, { name: nama, phone: telepon || undefined, address: alamat || undefined })
        setList((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
        toast.success("Customer diperbarui")
      } else {
        const created = await createCustomer({ name: nama, phone: telepon || undefined, address: alamat || undefined })
        setList((prev) => [created, ...prev])
        toast.success("Customer ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus customer ini?")) return
    try {
      await deleteCustomer(id)
      setList((prev) => prev.filter((c) => c.id !== id))
      toast.success("Customer dihapus")
      if (editing?.id === id) resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit Customer" : "Tambah Customer Baru"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama *</label>
          <input type="text" required placeholder="PT Sampoerna" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Telepon</label>
          <input type="text" placeholder="0812-3456-7890" value={telepon} onChange={(e) => setTelepon(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Alamat</label>
          <textarea placeholder="Jl. Raya Semarang, Kudus" value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={2}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none resize-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Simpan Customer"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Customer ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((c) => (
            <div key={c.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-start text-xs gap-2">
              <div className="min-w-0">
                <span className="font-bold text-foreground text-sm">{c.name}</span>
                {c.phone && <div className="text-muted-foreground font-mono text-[11px] mt-0.5">Telp: {c.phone}</div>}
                {c.address && <div className="text-muted-2 text-[11px] mt-0.5">{c.address}</div>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <button type="button" onClick={() => startEdit(c)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleDelete(c.id)} className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data customer.</p>}
        </div>
      </div>
    </div>
  )
}

function TobaccoTypesTab({ types: initial }: { types: TobaccoType[] }) {
  const [list, setList] = useState(initial)
  const [nama, setNama] = useState("")
  const [editing, setEditing] = useState<TobaccoType | null>(null)

  function resetForm() { setNama(""); setEditing(null) }

  function startEdit(t: TobaccoType) { setEditing(t); setNama(t.name); window.scrollTo({ top: 0, behavior: "smooth" }) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) { toast.error("Nama harus diisi"); return }
    try {
      if (editing) {
        const updated = await updateTobaccoType(editing.id, { name: nama })
        setList((prev) => prev.map((t) => (t.id === updated.id ? { ...t, name: updated.name } : t)))
        toast.success("Jenis tembakau diperbarui")
      } else {
        const created = await createTobaccoType({ name: nama })
        setList((prev) => [...prev, { ...created, grades: [] }])
        toast.success("Jenis tembakau ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleToggle(id: number, active: boolean) {
    try {
      const updated = await toggleTobaccoType(id, !active)
      setList((prev) => prev.map((t) => (t.id === id ? { ...t, active: updated.active } : t)))
      toast.success(updated.active ? "Diaktifkan" : "Dinonaktifkan")
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit Jenis Tembakau" : "Tambah Jenis Tembakau"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama *</label>
          <input type="text" required placeholder="Tembakau Temanggung Srintil" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Simpan"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">Batal</button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Jenis Tembakau ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((t) => (
            <div key={t.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-start text-xs gap-2">
              <div className="min-w-0">
                <span className="font-bold text-foreground text-sm">{t.name}</span>
                <div className="text-muted-foreground mt-0.5">
                  {t.grades.length > 0
                    ? `Grade: ${t.grades.map((g) => g.name).join(", ")}`
                    : "Belum ada grade"}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.active ? "bg-emerald/12 text-emerald" : "bg-muted text-muted-foreground"}`}>
                  {t.active ? "Aktif" : "Nonaktif"}
                </span>
                <button type="button" onClick={() => startEdit(t)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleToggle(t.id, t.active)} className={`p-1.5 rounded-lg cursor-pointer ${t.active ? "text-amber hover:bg-amber/10" : "text-emerald hover:bg-emerald/10"}`} title={t.active ? "Nonaktifkan" : "Aktifkan"}>
                  {t.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data jenis tembakau.</p>}
        </div>
      </div>
    </div>
  )
}

function LeafTypesTab({ types: initial }: { types: LeafType[] }) {
  const [list, setList] = useState(initial)
  const [nama, setNama] = useState("")
  const [editing, setEditing] = useState<LeafType | null>(null)

  function resetForm() { setNama(""); setEditing(null) }

  function startEdit(t: LeafType) { setEditing(t); setNama(t.name); window.scrollTo({ top: 0, behavior: "smooth" }) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) { toast.error("Nama harus diisi"); return }
    try {
      if (editing) {
        const updated = await updateLeafType(editing.id, { name: nama })
        setList((prev) => prev.map((t) => (t.id === updated.id ? { ...t, name: updated.name } : t)))
        toast.success("Jenis daun diperbarui")
      } else {
        const created = await createLeafType({ name: nama })
        setList((prev) => [...prev, created])
        toast.success("Jenis daun ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleToggle(id: number, active: boolean) {
    try {
      const updated = await toggleLeafType(id, !active)
      setList((prev) => prev.map((t) => (t.id === id ? { ...t, active: updated.active } : t)))
      toast.success(updated.active ? "Diaktifkan" : "Dinonaktifkan")
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit Jenis Daun" : "Tambah Jenis Daun"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama *</label>
          <input type="text" required placeholder="Rajangan Halus" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Simpan"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">Batal</button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Jenis Daun ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((t) => (
            <div key={t.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-center text-xs">
              <span className="font-bold text-foreground text-sm">{t.name}</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.active ? "bg-emerald/12 text-emerald" : "bg-muted text-muted-foreground"}`}>
                  {t.active ? "Aktif" : "Nonaktif"}
                </span>
                <button type="button" onClick={() => startEdit(t)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleToggle(t.id, t.active)} className={`p-1.5 rounded-lg cursor-pointer ${t.active ? "text-amber hover:bg-amber/10" : "text-emerald hover:bg-emerald/10"}`} title={t.active ? "Nonaktifkan" : "Aktifkan"}>
                  {t.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data jenis daun.</p>}
        </div>
      </div>
    </div>
  )
}

function PackingTypesTab({ types: initial }: { types: PackingType[] }) {
  const [list, setList] = useState(initial)
  const [nama, setNama] = useState("")
  const [weight, setWeight] = useState("")
  const [editing, setEditing] = useState<PackingType | null>(null)

  function resetForm() { setNama(""); setWeight(""); setEditing(null) }

  function startEdit(t: PackingType) { setEditing(t); setNama(t.name); setWeight(String(t.deductionWeight)); window.scrollTo({ top: 0, behavior: "smooth" }) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) { toast.error("Nama harus diisi"); return }
    const deductionWeight = parseFloat(weight) || 0
    try {
      if (editing) {
        const updated = await updatePackingType(editing.id, { name: nama, deductionWeight })
        setList((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        toast.success("Jenis packing diperbarui")
      } else {
        const created = await createPackingType({ name: nama, deductionWeight })
        setList((prev) => [...prev, created])
        toast.success("Jenis packing ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus jenis packing ini?")) return
    try {
      await deletePackingType(id)
      setList((prev) => prev.filter((t) => t.id !== id))
      toast.success("Jenis packing dihapus")
      if (editing?.id === id) resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit Jenis Packing" : "Tambah Jenis Packing"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama *</label>
          <input type="text" required placeholder="Keranjang Tembakau" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Tara Default (kg)</label>
          <input type="number" step="0.1" min="0" placeholder="3.5" value={weight} onChange={(e) => setWeight(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-mono font-bold rounded-lg outline-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Simpan"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">Batal</button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Jenis Packing ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((t) => (
            <div key={t.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-foreground text-sm">{t.name}</span>
                <div className="text-muted-foreground font-mono text-[11px] mt-0.5">Tara: {t.deductionWeight} kg</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => startEdit(t)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleDelete(t.id)} className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data jenis packing.</p>}
        </div>
      </div>
    </div>
  )
}

function GradesTab({ grades: initial, tobaccoTypes }: { grades: Grade[]; tobaccoTypes: TobaccoType[] }) {
  const [list, setList] = useState(initial)
  const [nama, setNama] = useState("")
  const [harga, setHarga] = useState("")
  const [tobaccoTypeId, setTobaccoTypeId] = useState(tobaccoTypes[0]?.id?.toString() ?? "")
  const [editing, setEditing] = useState<Grade | null>(null)

  function resetForm() { setNama(""); setHarga(""); setTobaccoTypeId(tobaccoTypes[0]?.id?.toString() ?? ""); setEditing(null) }

  function startEdit(g: Grade) {
    setEditing(g); setNama(g.name); setHarga(String(g.defaultPrice)); setTobaccoTypeId(String(g.tobaccoTypeId)); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim() || !tobaccoTypeId) { toast.error("Nama dan jenis tembakau harus diisi"); return }
    try {
      if (editing) {
        const updated = await updateGrade(editing.id, { name: nama, defaultPrice: parseFloat(harga) || 0, tobaccoTypeId: Number(tobaccoTypeId) })
        const tt = tobaccoTypes.find((t) => t.id === updated.tobaccoTypeId)
        setList((prev) => prev.map((g) => (g.id === updated.id ? { ...updated, tobaccoType: tt ?? editing.tobaccoType } : g)))
        toast.success("Grade diperbarui")
      } else {
        const created = await createGrade({ name: nama, defaultPrice: parseFloat(harga) || 0, tobaccoTypeId: Number(tobaccoTypeId) })
        const tt = tobaccoTypes.find((t) => t.id === created.tobaccoTypeId)
        setList((prev) => [...prev, { ...created, tobaccoType: tt ?? { id: created.tobaccoTypeId, name: "?" } }])
        toast.success("Grade ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus grade ini?")) return
    try {
      await deleteGrade(id)
      setList((prev) => prev.filter((g) => g.id !== id))
      toast.success("Grade dihapus")
      if (editing?.id === id) resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit Grade" : "Tambah Grade"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama Grade *</label>
          <input type="text" required placeholder="Srintil Super Class 1" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Jenis Tembakau *</label>
          <select value={tobaccoTypeId} onChange={(e) => setTobaccoTypeId(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-semibold rounded-lg outline-none">
            {tobaccoTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Harga Default / kg (Rp)</label>
          <input type="number" step="1" min="0" placeholder="180000" value={harga} onChange={(e) => setHarga(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-mono font-bold rounded-lg outline-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Simpan Grade"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">Batal</button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Grade Tembakau ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((g) => (
            <div key={g.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-center text-xs">
              <div className="min-w-0">
                <span className="font-bold text-foreground text-sm">{g.name}</span>
                <div className="text-muted-foreground text-[11px] mt-0.5">{g.tobaccoType.name}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono font-bold text-amber text-sm">{formatCurrency(g.defaultPrice)}<span className="text-[10px] text-muted-2 font-normal">/kg</span></span>
                <button type="button" onClick={() => startEdit(g)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleDelete(g.id)} className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data grade.</p>}
        </div>
      </div>
    </div>
  )
}

function WarehousesTab({ warehouses: initial }: { warehouses: WarehouseData[] }) {
  const [list, setList] = useState(initial)
  const [kode, setKode] = useState("")
  const [nama, setNama] = useState("")
  const [alamat, setAlamat] = useState("")
  const [editing, setEditing] = useState<WarehouseData | null>(null)

  function resetForm() { setKode(""); setNama(""); setAlamat(""); setEditing(null) }

  function startEdit(w: WarehouseData) {
    setEditing(w); setKode(w.code); setNama(w.name); setAlamat(w.address ?? ""); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!kode.trim() || !nama.trim()) { toast.error("Kode dan nama gudang harus diisi"); return }
    try {
      if (editing) {
        const updated = await updateWarehouse(editing.id, { code: kode, name: nama, address: alamat || undefined })
        setList((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)))
        toast.success("Gudang diperbarui")
      } else {
        const created = await createWarehouse({ code: kode, name: nama, address: alamat || undefined })
        setList((prev) => [...prev, created])
        toast.success("Gudang ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleToggle(id: number, active: boolean) {
    try {
      const updated = await toggleWarehouse(id, !active)
      setList((prev) => prev.map((w) => (w.id === id ? { ...w, active: updated.active } : w)))
      toast.success(updated.active ? "Diaktifkan" : "Dinonaktifkan")
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus gudang ini?")) return
    try {
      await deleteWarehouse(id)
      setList((prev) => prev.filter((w) => w.id !== id))
      toast.success("Gudang dihapus")
      if (editing?.id === id) resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit Gudang" : "Tambah Gudang Baru"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Kode *</label>
          <input type="text" required placeholder="GDG01" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-mono font-bold rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama *</label>
          <input type="text" required placeholder="Gudang Temanggung 1" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Alamat</label>
          <textarea placeholder="Jl. Raya Tembakau No. 1" value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={2}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none resize-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Simpan Gudang"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">Batal</button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Gudang ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((w) => (
            <div key={w.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-start text-xs gap-2">
              <div className="min-w-0">
                <span className="font-mono font-bold text-emerald text-sm">{w.code}</span>
                <span className="font-bold text-foreground text-sm ml-2">{w.name}</span>
                {w.address && <div className="text-muted-2 text-[11px] mt-0.5">{w.address}</div>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${w.active ? "bg-emerald/12 text-emerald" : "bg-muted text-muted-foreground"}`}>
                  {w.active ? "Aktif" : "Nonaktif"}
                </span>
                <button type="button" onClick={() => startEdit(w)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleToggle(w.id, w.active)} className={`p-1.5 rounded-lg cursor-pointer ${w.active ? "text-amber hover:bg-amber/10" : "text-emerald hover:bg-emerald/10"}`} title={w.active ? "Nonaktifkan" : "Aktifkan"}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDelete(w.id)} className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data gudang.</p>}
        </div>
      </div>
    </div>
  )
}

function LanesTab({ lanes: initial, warehouses }: { lanes: LaneData[]; warehouses: WarehouseData[] }) {
  const [list, setList] = useState(initial)
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id?.toString() ?? "")
  const [kode, setKode] = useState("")
  const [nama, setNama] = useState("")
  const [editing, setEditing] = useState<LaneData | null>(null)

  function resetForm() { setWarehouseId(warehouses[0]?.id?.toString() ?? ""); setKode(""); setNama(""); setEditing(null) }

  function startEdit(l: LaneData) {
    setEditing(l); setWarehouseId(String(l.warehouseId)); setKode(l.code); setNama(l.name); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!warehouseId) { toast.error("Pilih gudang"); return }
    if (!kode.trim() || !nama.trim()) { toast.error("Kode dan nama jalur harus diisi"); return }
    try {
      if (editing) {
        const updated = await updateLane(editing.id, { code: kode, name: nama, warehouseId: Number(warehouseId) })
        const wh = warehouses.find((w) => w.id === updated.warehouseId)
        setList((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated, warehouse: wh ?? editing.warehouse } : l)))
        toast.success("Jalur diperbarui")
      } else {
        const created = await createLane({ code: kode, name: nama, warehouseId: Number(warehouseId) })
        const wh = warehouses.find((w) => w.id === created.warehouseId)
        setList((prev) => [...prev, { ...created, active: true, warehouse: wh ?? { id: created.warehouseId, code: "?", name: "?" } }])
        toast.success("Jalur ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleToggle(id: number, active: boolean) {
    try {
      const updated = await toggleLane(id, !active)
      setList((prev) => prev.map((l) => (l.id === id ? { ...l, active: updated.active } : l)))
      toast.success(updated.active ? "Diaktifkan" : "Dinonaktifkan")
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus jalur ini?")) return
    try {
      await deleteLane(id)
      setList((prev) => prev.filter((l) => l.id !== id))
      toast.success("Jalur dihapus")
      if (editing?.id === id) resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit Jalur" : "Tambah Jalur Baru"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Gudang *</label>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-semibold rounded-lg outline-none">
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Kode Jalur *</label>
          <input type="text" required placeholder="GDG01-J1" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-mono font-bold rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama Jalur *</label>
          <input type="text" required placeholder="Jalur 1" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Simpan Jalur"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">Batal</button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Jalur ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((l) => (
            <div key={l.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-start text-xs gap-2">
              <div className="min-w-0">
                <span className="font-mono font-bold text-emerald text-sm">{l.code}</span>
                <span className="font-bold text-foreground text-sm ml-2">{l.name}</span>
                <div className="text-muted-foreground text-[11px] mt-0.5">{l.warehouse.code} — {l.warehouse.name}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.active ? "bg-emerald/12 text-emerald" : "bg-muted text-muted-foreground"}`}>
                  {l.active ? "Aktif" : "Nonaktif"}
                </span>
                <button type="button" onClick={() => startEdit(l)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleToggle(l.id, l.active)} className={`p-1.5 rounded-lg cursor-pointer ${l.active ? "text-amber hover:bg-amber/10" : "text-emerald hover:bg-emerald/10"}`} title={l.active ? "Nonaktifkan" : "Aktifkan"}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDelete(l.id)} className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data jalur.</p>}
        </div>
      </div>
    </div>
  )
}

function UsersTab({ users: initial, lanes }: { users: User[]; lanes: LaneData[] }) {
  const [list, setList] = useState(initial)
  const [nama, setNama] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("GRADER")
  const [laneId, setLaneId] = useState("")
  const [password, setPassword] = useState("")
  const [editing, setEditing] = useState<User | null>(null)

  function resetForm() { setNama(""); setUsername(""); setEmail(""); setRole("GRADER"); setLaneId(""); setPassword(""); setEditing(null) }

  function startEdit(u: User) {
    setEditing(u); setNama(u.name ?? ""); setUsername(u.username ?? ""); setEmail(u.email ?? ""); setRole(u.role); setLaneId(u.laneId ? String(u.laneId) : ""); setPassword(""); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function normalizeUser(u: Awaited<ReturnType<typeof createUser>>): User {
    const lane = lanes.find((l) => l.id === u.laneId) ?? null
    return {
      ...u,
      lane: lane ? { id: lane.id, code: lane.code, name: lane.name, warehouse: lane.warehouse } : null,
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim() || !username.trim()) { toast.error("Nama dan username harus diisi"); return }
    const assignedLaneId = laneId ? Number(laneId) : null
    try {
      if (editing) {
        const updated = await updateUser(editing.id, { name: nama, username, email: email || undefined, role, laneId: assignedLaneId })
        setList((prev) => prev.map((u) => (u.id === updated.id ? normalizeUser(updated) : u)))
        toast.success("User diperbarui")
      } else {
        const created = await createUser({ name: nama, username, email: email || undefined, password: password || undefined, role, laneId: assignedLaneId })
        setList((prev) => [...prev, normalizeUser(created)])
        toast.success("User ditambahkan")
      }
      resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus user ini?")) return
    try {
      await deleteUser(id)
      setList((prev) => prev.filter((u) => u.id !== id))
      toast.success("User dihapus")
      if (editing?.id === id) resetForm()
    } catch (err) { toast.error((err as Error).message) }
  }

  const roleOptions = ["GRADER", "OPERATOR", "FINANCE", "ADMIN", "OWNER", "SUPER_ADMIN"]

  const lanesByWarehouse = lanes.reduce<Record<string, LaneData[]>>((acc, lane) => {
    const key = lane.warehouse.code
    if (!acc[key]) acc[key] = []
    acc[key].push(lane)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="lg:col-span-4 bg-panel border border-border rounded-xl p-4 space-y-3 h-fit">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-4 h-4 text-emerald" /> {editing ? "Edit User" : "Tambah User Baru"}
        </h3>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nama *</label>
          <input type="text" required placeholder="Budi Grader" value={nama} onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-bold rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Username *</label>
          <input type="text" required placeholder="budi.grader" value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-mono rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Email</label>
          <input type="email" placeholder="budi@tobak-os.local" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Role *</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-semibold rounded-lg outline-none">
            {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">Jalur Kerja</label>
          <select value={laneId} onChange={(e) => setLaneId(e.target.value)}
            className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs font-semibold rounded-lg outline-none">
            <option value="">Tidak ditugaskan (pilih manual)</option>
            {Object.entries(lanesByWarehouse).map(([warehouseCode, warehouseLanes]) => (
              <optgroup key={warehouseCode} label={`${warehouseCode} · ${warehouseLanes[0].warehouse.name}`}>
                {warehouseLanes.map((lane) => (
                  <option key={lane.id} value={lane.id}>{lane.code} — {lane.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {!editing && (
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none" />
          </div>
        )}
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-xs rounded-lg shadow cursor-pointer">
            {editing ? "Simpan Perubahan" : "Tambah User"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer">Batal</button>
          )}
        </div>
      </form>

      <div className="lg:col-span-8 bg-panel border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Daftar Users ({list.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {list.map((u) => (
            <div key={u.id} className="p-3 bg-panel-alt border border-border-soft rounded-lg flex justify-between items-start text-xs gap-2">
              <div className="min-w-0">
                <span className="font-bold text-foreground text-sm">{u.name ?? "—"}</span>
                <div className="text-muted-foreground font-mono text-[11px] mt-0.5">
                  @{u.username} {u.email && `• ${u.email}`}
                </div>
                {u.lane ? (
                  <div className="text-[11px] text-foreground/70 mt-1">
                    <span className="font-mono text-emerald font-bold">{u.lane.code}</span> — {u.lane.warehouse.code} · {u.lane.name}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-2 mt-1">Belum ditugaskan ke jalur</div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  u.role === "ADMIN" ? "bg-amber/12 text-amber" : u.role === "SUPER_ADMIN" ? "bg-emerald/12 text-emerald" : u.role === "OPERATOR" ? "bg-emerald/12 text-emerald" : u.role === "FINANCE" ? "bg-amber/12 text-amber" : "bg-muted text-muted-foreground"
                }`}>
                  {u.role}
                </span>
                <button type="button" onClick={() => startEdit(u)} className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => handleDelete(u.id)} className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data user.</p>}
        </div>
      </div>
    </div>
  )
}
