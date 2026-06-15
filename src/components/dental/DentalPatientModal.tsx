import { useEffect, useState } from "react";
import { Calendar, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DentalPatient } from "./DentalPatientsTable";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSave: (patient: DentalPatient) => void | Promise<void>;
  patient?: DentalPatient | null;
}

const inputCls =
  "w-full h-10 px-3 rounded border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white";

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskPhoneBR(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs text-slate-600 mb-1 block">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  );
}

export function DentalPatientModal({ open, onOpenChange, onSave, patient }: Props) {
  const [name, setName] = useState("");
  const [sex, setSex] = useState("M");
  const [foreignPatient, setForeignPatient] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("");
  const [tags, setTags] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleBirthDate, setResponsibleBirthDate] = useState("");
  const [responsibleCpf, setResponsibleCpf] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<"info" | "plan" | "address">("info");
  const [email, setEmail] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [patientNumber, setPatientNumber] = useState("");
  const [recordNumber, setRecordNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [socialNetwork, setSocialNetwork] = useState("");
  const [planName, setPlanName] = useState("Particular");
  const [insuranceCardNumber, setInsuranceCardNumber] = useState("");
  const [insuranceHolder, setInsuranceHolder] = useState("");
  const [insuranceResponsibleCpf, setInsuranceResponsibleCpf] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const reset = () => {
    setName("");
    setSex("M");
    setForeignPatient(false);
    setBirthDate("");
    setCpf("");
    setRg("");
    setPhone("");
    setOrigin("");
    setTags("");
    setResponsibleName("");
    setResponsibleBirthDate("");
    setResponsibleCpf("");
    setResponsiblePhone("");
    setNotes("");
    setTab("info");
    setEmail("");
    setPhoneSecondary("");
    setPatientNumber("");
    setRecordNumber("");
    setProfession("");
    setSocialNetwork("");
    setPlanName("Particular");
    setInsuranceCardNumber("");
    setInsuranceHolder("");
    setInsuranceResponsibleCpf("");
    setZipCode("");
    setStreet("");
    setAddressNumber("");
    setAddressComplement("");
    setNeighborhood("");
    setCity("");
    setStateUf("");
  };

  const lookupCep = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();

      if (data?.erro) {
        toast.error("CEP nao encontrado.");
        return;
      }

      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setStateUf(data.uf || "");
    } catch {
      toast.error("Nao foi possivel consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  useEffect(() => {
    if (open && patient) {
      setName(patient.name || "");
      setSex(patient.sex === "female" ? "F" : "M");
      setForeignPatient(Boolean(patient.foreignPatient));
      setBirthDate(patient.birthDate || "");
      setCpf(patient.cpf || "");
      setRg(patient.rg || "");
      setPhone(patient.phone && patient.phone !== "-" ? patient.phone : "");
      setOrigin(patient.origin || "");
      setTags((patient.tags || []).join(", "));
      setResponsibleName(patient.responsibleName || "");
      setResponsibleBirthDate(patient.responsibleBirthDate || "");
      setResponsibleCpf(patient.responsibleCpf || "");
      setResponsiblePhone(patient.responsiblePhone || "");
      setNotes(patient.notes || "");
      setEmail(patient.email || "");
      setPhoneSecondary(patient.phoneSecondary || "");
      setPatientNumber(patient.patientNumber || "");
      setRecordNumber(patient.chart || "");
      setProfession(patient.profession || "");
      setSocialNetwork(patient.socialNetwork || "");
      setPlanName(patient.planName || "Particular");
      setInsuranceCardNumber(patient.insuranceCardNumber || "");
      setInsuranceHolder(patient.insuranceHolder || "");
      setInsuranceResponsibleCpf(patient.insuranceResponsibleCpf || "");
      setZipCode(patient.zipCode || "");
      setStreet(patient.street || "");
      setAddressNumber(patient.addressNumber || "");
      setAddressComplement(patient.addressComplement || "");
      setNeighborhood(patient.neighborhood || "");
      setCity(patient.city || "");
      setStateUf(patient.state || "");
    }

    if (open && !patient) {
      reset();
    }
  }, [open, patient]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do paciente.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: patient?.id ?? crypto.randomUUID(),
        name: name.trim(),
        cpf: cpf || undefined,
        phone: phone || "-",
        chart: recordNumber || undefined,
        age: patient?.age,
        sex: sex === "F" ? "female" : "male",
        foreignPatient,
        birthDate: birthDate || undefined,
        rg: rg || undefined,
        origin: origin || undefined,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        responsibleName: responsibleName || undefined,
        responsibleBirthDate: responsibleBirthDate || undefined,
        responsibleCpf: responsibleCpf || undefined,
        responsiblePhone: responsiblePhone || undefined,
        notes: notes || undefined,
        email: email || undefined,
        phoneSecondary: phoneSecondary || undefined,
        patientNumber: patientNumber || undefined,
        profession: profession || undefined,
        socialNetwork: socialNetwork || undefined,
        planName: planName || "Particular",
        insuranceCardNumber: insuranceCardNumber || undefined,
        insuranceHolder: insuranceHolder || undefined,
        insuranceResponsibleCpf: insuranceResponsibleCpf || undefined,
        zipCode: zipCode || undefined,
        street: street || undefined,
        addressNumber: addressNumber || undefined,
        addressComplement: addressComplement || undefined,
        neighborhood: neighborhood || undefined,
        city: city || undefined,
        state: stateUf || undefined,
      });

      reset();
      onOpenChange(false);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) reset(); onOpenChange(value); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-blue-700 text-lg">
            {patient ? "Editar paciente" : "Dados do paciente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <FieldLabel required>Nome do paciente</FieldLabel>
            <Input className={inputCls} value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Sexo</FieldLabel>
              <div className="flex items-center gap-5 h-10">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="sex" checked={sex === "M"} onChange={() => setSex("M")} />
                  Masculino
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="sex" checked={sex === "F"} onChange={() => setSex("F")} />
                  Feminino
                </label>
              </div>
            </div>

            <div>
              <FieldLabel>Paciente estrangeiro</FieldLabel>
              <button
                type="button"
                onClick={() => setForeignPatient((value) => !value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${foreignPatient ? "bg-blue-600" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${foreignPatient ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Data de nascimento</FieldLabel>
              <div className="relative">
                <Input type="date" className={inputCls} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
                <Calendar className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <FieldLabel>CPF</FieldLabel>
              <Input className={inputCls} value={cpf} onChange={(event) => setCpf(maskCpf(event.target.value))} placeholder="000.000.000-00" />
            </div>
            <div>
              <FieldLabel>RG</FieldLabel>
              <Input className={inputCls} value={rg} onChange={(event) => setRg(event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Celular do paciente</FieldLabel>
              <div className="flex">
                <span className="inline-flex items-center gap-1 px-3 h-10 border border-r-0 border-slate-300 rounded-l bg-slate-50 text-sm text-slate-700">
                  BR +55
                </span>
                <Input
                  className={`${inputCls} rounded-l-none`}
                  value={phone}
                  onChange={(event) => setPhone(maskPhoneBR(event.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Como o paciente chegou na clinica</FieldLabel>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger className="h-10 bg-white border-slate-300 text-sm text-slate-800 [&>span]:text-slate-800 data-[placeholder]:text-slate-400">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-800">
                  <SelectItem value="indicacao" className="text-slate-800 focus:bg-blue-50 focus:text-blue-700">
                    Indicacao
                  </SelectItem>
                  <SelectItem value="instagram" className="text-slate-800 focus:bg-blue-50 focus:text-blue-700">
                    Instagram
                  </SelectItem>
                  <SelectItem value="google" className="text-slate-800 focus:bg-blue-50 focus:text-blue-700">
                    Google
                  </SelectItem>
                  <SelectItem value="whatsapp" className="text-slate-800 focus:bg-blue-50 focus:text-blue-700">
                    WhatsApp
                  </SelectItem>
                  <SelectItem value="outros" className="text-slate-800 focus:bg-blue-50 focus:text-blue-700">
                    Outros
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel>Etiquetas</FieldLabel>
            <div className="relative">
              <Input
                className={`${inputCls} pl-9`}
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Adicionar etiquetas"
              />
              <Tag className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-blue-700 font-medium text-base mt-4 mb-3">Dados do responsavel</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Nome do responsavel</FieldLabel>
                <Input className={inputCls} value={responsibleName} onChange={(event) => setResponsibleName(event.target.value)} />
              </div>
              <div>
                <FieldLabel>Data de nascimento do responsavel</FieldLabel>
                <Input type="date" className={inputCls} value={responsibleBirthDate} onChange={(event) => setResponsibleBirthDate(event.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <FieldLabel>CPF</FieldLabel>
                <Input className={inputCls} value={responsibleCpf} onChange={(event) => setResponsibleCpf(maskCpf(event.target.value))} placeholder="000.000.000-00" />
              </div>
              <div>
                <FieldLabel>Celular do responsavel</FieldLabel>
                <Input className={inputCls} value={responsiblePhone} onChange={(event) => setResponsiblePhone(maskPhoneBR(event.target.value))} placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel>Observacao</FieldLabel>
              <Textarea
                className="min-h-[100px] bg-white border-slate-300 text-sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center gap-6 border-b border-slate-200 mt-2">
              {[
                { id: "info", label: "INFORMACOES ADICIONAIS" },
                { id: "plan", label: "PLANO" },
                { id: "address", label: "ENDERECO" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id as "info" | "plan" | "address")}
                  className={`relative px-1 py-3 text-xs font-semibold tracking-wide transition-colors ${
                    tab === item.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {item.label}
                  {tab === item.id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-600 rounded-t" />}
                </button>
              ))}
            </div>

            <div className="pt-5">
              {tab === "info" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>E-mail</FieldLabel>
                    <Input className={inputCls} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Telefone</FieldLabel>
                    <Input className={inputCls} value={phoneSecondary} onChange={(event) => setPhoneSecondary(maskPhoneBR(event.target.value))} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <FieldLabel>Numero do paciente</FieldLabel>
                    <Input className={inputCls} value={patientNumber} onChange={(event) => setPatientNumber(event.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Numero de prontuario</FieldLabel>
                    <Input className={inputCls} value={recordNumber} onChange={(event) => setRecordNumber(event.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Profissao</FieldLabel>
                    <Input className={inputCls} value={profession} onChange={(event) => setProfession(event.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Rede Social</FieldLabel>
                    <Input className={inputCls} value={socialNetwork} onChange={(event) => setSocialNetwork(event.target.value)} />
                  </div>
                </div>
              )}

              {tab === "plan" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Plano</FieldLabel>
                    <Input className={inputCls} value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Particular" />
                  </div>
                  <div>
                    <FieldLabel>Numero da carteirinha</FieldLabel>
                    <Input className={inputCls} value={insuranceCardNumber} onChange={(event) => setInsuranceCardNumber(event.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Titular do plano</FieldLabel>
                    <Input className={inputCls} value={insuranceHolder} onChange={(event) => setInsuranceHolder(event.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>CPF do responsavel</FieldLabel>
                    <Input className={inputCls} value={insuranceResponsibleCpf} onChange={(event) => setInsuranceResponsibleCpf(maskCpf(event.target.value))} placeholder="000.000.000-00" />
                  </div>
                </div>
              )}

              {tab === "address" && (
                <div className="grid grid-cols-6 gap-4">
                  <div className="col-span-2">
                    <FieldLabel>CEP</FieldLabel>
                    <Input
                      className={inputCls}
                      value={zipCode}
                      onChange={(event) => {
                        const masked = maskCep(event.target.value);
                        setZipCode(masked);
                        if (masked.replace(/\D/g, "").length === 8) lookupCep(masked);
                      }}
                      onBlur={(event) => lookupCep(event.target.value)}
                      placeholder="00000-000"
                      disabled={cepLoading}
                    />
                  </div>
                  <div className="col-span-3">
                    <FieldLabel>Rua</FieldLabel>
                    <Input className={inputCls} value={street} onChange={(event) => setStreet(event.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <FieldLabel>Numero</FieldLabel>
                    <Input className={inputCls} value={addressNumber} onChange={(event) => setAddressNumber(event.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <FieldLabel>Complemento</FieldLabel>
                    <Input className={inputCls} value={addressComplement} onChange={(event) => setAddressComplement(event.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <FieldLabel>Bairro</FieldLabel>
                    <Input className={inputCls} value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <FieldLabel>Cidade</FieldLabel>
                    <Input className={inputCls} value={city} onChange={(event) => setCity(event.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel>Estado</FieldLabel>
                    <Input className={inputCls} value={stateUf} onChange={(event) => setStateUf(event.target.value.toUpperCase())} placeholder="UF" maxLength={2} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-4">
          <button
            onClick={() => { reset(); onOpenChange(false); }}
            disabled={saving}
            className="px-5 h-10 rounded text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            FECHAR
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 h-10 rounded text-sm font-medium bg-green-500 hover:bg-green-600 text-white"
          >
            {saving ? "SALVANDO..." : "SALVAR"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
