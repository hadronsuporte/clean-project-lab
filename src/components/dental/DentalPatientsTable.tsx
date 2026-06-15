import { FileText, MessageCircle, Pencil } from "lucide-react";

export type DentalPatient = {
  id: string;
  name: string;
  chart?: string;
  age?: string;
  cpf?: string;
  phone: string;
  email?: string;
  birthDate?: string;
  rg?: string;
  sex?: string;
  foreignPatient?: boolean;
  origin?: string;
  tags?: string[];
  notes?: string;
  responsibleName?: string;
  responsibleBirthDate?: string;
  responsibleCpf?: string;
  responsiblePhone?: string;
  phoneSecondary?: string;
  patientNumber?: string;
  profession?: string;
  socialNetwork?: string;
  planName?: string;
  insuranceCardNumber?: string;
  insuranceHolder?: string;
  insuranceResponsibleCpf?: string;
  zipCode?: string;
  street?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

interface Props {
  patients: DentalPatient[];
  onEdit?: (patient: DentalPatient) => void;
}

export function DentalPatientsTable({ patients, onEdit }: Props) {
  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr className="text-left">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Prontuario</th>
            <th className="px-4 py-3 font-medium">Idade</th>
            <th className="px-4 py-3 font-medium">CPF</th>
            <th className="px-4 py-3 font-medium">Celular do paciente</th>
            <th className="px-4 py-3 font-medium text-right">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-800">{patient.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{patient.chart || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{patient.age || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{patient.cpf || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{patient.phone}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"
                    aria-label="WhatsApp"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit?.(patient)}
                    className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                    aria-label="Editar"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="h-8 w-8 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center"
                    aria-label="Abrir ficha"
                    title="Abrir ficha"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {patients.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Nenhum paciente encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
