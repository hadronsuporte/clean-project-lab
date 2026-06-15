import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { DentalSidebar } from "@/components/dental/DentalSidebar";
import { DentalTopbar } from "@/components/dental/DentalTopbar";
import {
  DentalPatientsTable,
  type DentalPatient,
} from "@/components/dental/DentalPatientsTable";
import { DentalPatientModal } from "@/components/dental/DentalPatientModal";
import { useDental } from "@/contexts/DentalContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function calculateAge(birthDate?: string | null) {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Number.isFinite(age) ? String(age) : undefined;
}

export default function DentalPatients() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DentalPatient | null>(null);
  const [patients, setPatients] = useState<DentalPatient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const { activeClinic } = useDental();

  const mapPatient = (row: any): DentalPatient => ({
    id: row.id,
    name: row.full_name,
    chart: row.record_number || row.patient_number || undefined,
    age: calculateAge(row.birth_date),
    cpf: row.cpf || undefined,
    phone: row.phone || "-",
    email: row.email || undefined,
    birthDate: row.birth_date || undefined,
    rg: row.rg || undefined,
    sex: row.sex || undefined,
    foreignPatient: row.foreign_patient || false,
    origin: row.source || undefined,
    tags: row.tags || [],
    notes: row.notes || undefined,
    responsibleName: row.responsible_name || undefined,
    responsibleBirthDate: row.responsible_birth_date || undefined,
    responsibleCpf: row.responsible_cpf || undefined,
    responsiblePhone: row.responsible_phone || undefined,
    phoneSecondary: row.phone_secondary || undefined,
    patientNumber: row.patient_number || undefined,
    profession: row.profession || undefined,
    socialNetwork: row.social_network || undefined,
    planName: row.plan_name || "Particular",
    insuranceCardNumber: row.insurance_card_number || undefined,
    insuranceHolder: row.insurance_holder || undefined,
    insuranceResponsibleCpf: row.insurance_responsible_cpf || undefined,
    zipCode: row.zip_code || undefined,
    street: row.street || undefined,
    addressNumber: row.address_number || undefined,
    addressComplement: row.address_complement || undefined,
    neighborhood: row.neighborhood || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
  });

  const loadPatients = async () => {
    if (!activeClinic?.clinic_id) return;

    setLoadingPatients(true);
    try {
      const { data, error } = await supabase
        .from("dental_patients" as any)
        .select("*")
        .eq("clinic_id", activeClinic.clinic_id)
        .order("full_name", { ascending: true });

      if (error) throw error;

      setPatients(((data as any[]) || []).map(mapPatient));
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar pacientes.");
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [activeClinic?.clinic_id]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return patients;

    return patients.filter((patient) =>
      [
        patient.name,
        patient.cpf,
        patient.phone,
        patient.email,
        patient.chart,
        patient.patientNumber,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [patients, query]);

  const savePatient = async (patient: DentalPatient) => {
    if (!activeClinic?.clinic_id) {
      toast.error("Clinica dental nao encontrada.");
      throw new Error("Clinica dental nao encontrada.");
    }

    const payload = {
      clinic_id: activeClinic.clinic_id,
      full_name: patient.name,
      record_number: patient.chart || null,
      cpf: patient.cpf || null,
      phone: patient.phone && patient.phone !== "-" ? patient.phone : null,
      email: patient.email || null,
      birth_date: patient.birthDate || null,
      rg: patient.rg || null,
      sex: patient.sex || null,
      foreign_patient: patient.foreignPatient || false,
      source: patient.origin || null,
      tags: patient.tags || [],
      notes: patient.notes || null,
      responsible_name: patient.responsibleName || null,
      responsible_birth_date: patient.responsibleBirthDate || null,
      responsible_cpf: patient.responsibleCpf || null,
      responsible_phone: patient.responsiblePhone || null,
      phone_secondary: patient.phoneSecondary || null,
      patient_number: patient.patientNumber || null,
      profession: patient.profession || null,
      social_network: patient.socialNetwork || null,
      plan_name: patient.planName || "Particular",
      insurance_card_number: patient.insuranceCardNumber || null,
      insurance_holder: patient.insuranceHolder || null,
      insurance_responsible_cpf: patient.insuranceResponsibleCpf || null,
      zip_code: patient.zipCode || null,
      street: patient.street || null,
      address_number: patient.addressNumber || null,
      address_complement: patient.addressComplement || null,
      neighborhood: patient.neighborhood || null,
      city: patient.city || null,
      state: patient.state || null,
    };

    const request = editing
      ? supabase.from("dental_patients" as any).update(payload).eq("id", patient.id)
      : supabase.from("dental_patients" as any).insert(payload);

    const { error } = await request;

    if (error) {
      toast.error(error.message || "Erro ao salvar paciente.");
      throw error;
    }

    toast.success(editing ? "Paciente atualizado com sucesso." : "Paciente cadastrado com sucesso.");
    await loadPatients();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <DentalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DentalTopbar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-semibold text-slate-800">Pacientes</h1>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-2 h-10 px-4 rounded text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                  <Download className="h-4 w-4" />
                  EXPORTAR
                </button>
                <button
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded text-sm font-medium bg-green-500 hover:bg-green-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                  NOVO PACIENTE
                </button>
              </div>
            </div>

            <div className="relative mb-5">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite o nome do paciente, CPF, celular do paciente..."
                className="w-full h-10 pl-10 pr-4 rounded border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {loadingPatients ? (
              <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500">
                Carregando pacientes...
              </div>
            ) : (
              <DentalPatientsTable
                patients={filtered}
                onEdit={(patient) => {
                  setEditing(patient);
                  setOpen(true);
                }}
              />
            )}

            <div className="mt-8 max-w-md mx-auto text-center bg-white border border-slate-200 rounded-md p-5">
              <p className="text-slate-800 font-medium mb-1">Migracao simplificada</p>
              <p className="text-slate-600 text-sm">
                Ja usa um sistema e gostaria de migrar seus dados?{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Clique aqui e saiba mais!
                </a>
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Duvidas?{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Saiba tudo sobre Ficha do paciente
              </a>
            </p>
          </div>
        </main>
      </div>

      <DentalPatientModal
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setEditing(null);
        }}
        patient={editing}
        onSave={savePatient}
      />
    </div>
  );
}
