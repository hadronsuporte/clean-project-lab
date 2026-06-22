import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const serviceBusinesses = [
  {
    name: "Clube do Pet São Carlos",
    slug: "demo-pet-clube-do-pet-sao-carlos",
    description: "Banho, tosa e cuidados completos para cães e gatos.",
    phone: "16997011001",
    address: "Avenida São Carlos, 1820 - Centro - São Carlos/SP - CEP 13560-011",
    latitude: -22.0162,
    longitude: -47.8918,
    image: "https://images.unsplash.com/photo-1599443015574-be5fe8a05783?auto=format&fit=crop&w=900&h=600&q=82",
    professionals: ["Mariana Lopes", "Felipe Andrade"],
  },
  {
    name: "Patas & Pelos Banho e Tosa",
    slug: "demo-pet-patas-e-pelos",
    description: "Estética animal com atendimento carinhoso e hora marcada.",
    phone: "16997011002",
    address: "Rua Episcopal, 1135 - Centro - São Carlos/SP - CEP 13560-570",
    latitude: -22.0191,
    longitude: -47.8932,
    image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&h=600&q=82",
    professionals: ["Camila Nogueira", "Rafael Moraes"],
  },
  {
    name: "Espaço AuMiau",
    slug: "demo-pet-espaco-aumiau",
    description: "Bem-estar, higiene, hidratação e cuidados especiais para seu pet.",
    phone: "16997011003",
    address: "Rua XV de Novembro, 2060 - Centro - São Carlos/SP - CEP 13560-240",
    latitude: -22.0137,
    longitude: -47.8879,
    image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=900&h=600&q=82",
    professionals: ["Ana Beatriz Santos", "Lucas Ferreira"],
  },
];

const retailBusinesses = [
  {
    name: "Mundo das Rações",
    slug: "demo-pet-mundo-das-racoes",
    description: "Rações, petiscos e acessórios para cães, gatos, aves e pequenos animais.",
    phone: "16997012001",
    address: "Avenida Dr. Carlos Botelho, 1240 - Vila Pureza - São Carlos/SP - CEP 13561-003",
    latitude: -22.0077,
    longitude: -47.8924,
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=900&h=600&q=82",
  },
  {
    name: "Empório Animal",
    slug: "demo-pet-emporio-animal",
    description: "Produtos selecionados, higiene, brinquedos e alimentação premium.",
    phone: "16997012002",
    address: "Rua Dona Alexandrina, 1745 - Centro - São Carlos/SP - CEP 13560-290",
    latitude: -22.0214,
    longitude: -47.8899,
    image: "https://images.unsplash.com/photo-1601758174114-e711c0cbaa69?auto=format&fit=crop&w=900&h=600&q=82",
  },
  {
    name: "Casa do Pet Rações e Acessórios",
    slug: "demo-pet-casa-do-pet",
    description: "Tudo para o dia a dia do seu pet, com variedade e entrega local.",
    phone: "16997012003",
    address: "Avenida Sallum, 890 - Vila Prado - São Carlos/SP - CEP 13574-040",
    latitude: -22.0296,
    longitude: -47.8988,
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&h=600&q=82",
  },
];

const { data: category, error: categoryError } = await supabase
  .from("business_categories")
  .select("id,name")
  .eq("slug", "pet")
  .single();
if (categoryError) throw categoryError;

const { data: catalog, error: catalogError } = await supabase
  .from("service_catalog")
  .select("id,name,slug,icon_key")
  .eq("category_id", category.id)
  .eq("active", true);
if (catalogError) throw catalogError;

const commercialSlugs = new Set(["pet-shop", "racoes-e-acessorios", "loja-de-racoes"]);
const appointmentCatalog = (catalog || []).filter((item) => !commercialSlugs.has(item.slug));

const { data: authPage, error: authListError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (authListError) throw authListError;
const usersByEmail = new Map(
  (authPage.users || []).map((user) => [String(user.email || "").toLowerCase(), user]),
);

let businessesCreated = 0;
let servicesCreated = 0;
let professionalsCreated = 0;

async function upsertBusiness(item, petTypes) {
  const payload = {
    name: item.name,
    slug: item.slug,
    phone: item.phone,
    address: item.address,
    logo_url: item.image,
    active: true,
    description: item.description,
    blocked: false,
    subscription_status: "active",
    subscription_plan: "monthly",
    monthly_price: 0,
    category_id: category.id,
    latitude: item.latitude,
    longitude: item.longitude,
    pet_types: petTypes,
  };

  const { data: existing, error: findError } = await supabase
    .from("barbershops")
    .select("id")
    .eq("slug", item.slug)
    .maybeSingle();
  if (findError) throw findError;

  let id = existing?.id;
  if (id) {
    const { error } = await supabase.from("barbershops").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("barbershops").insert(payload).select("id").single();
    if (error) throw error;
    id = data.id;
    businessesCreated += 1;
  }

  const { error: linkError } = await supabase.from("barbershop_categories").upsert(
    { barbershop_id: id, category_id: category.id },
    { onConflict: "barbershop_id,category_id", ignoreDuplicates: true },
  );
  if (linkError) throw linkError;
  return id;
}

for (const [businessIndex, item] of serviceBusinesses.entries()) {
  const businessId = await upsertBusiness(item, ["Pet shop"]);

  const { data: existingServices, error: existingServiceError } = await supabase
    .from("services")
    .select("catalog_service_id")
    .eq("barbershop_id", businessId);
  if (existingServiceError) throw existingServiceError;
  const existingCatalogIds = new Set(
    (existingServices || []).map((service) => service.catalog_service_id).filter(Boolean),
  );

  const rotatedCatalog = [
    ...appointmentCatalog.slice(businessIndex * 2),
    ...appointmentCatalog.slice(0, businessIndex * 2),
  ].slice(0, 6);
  const services = rotatedCatalog
    .filter((service) => !existingCatalogIds.has(service.id))
    .map((service, index) => ({
      barbershop_id: businessId,
      name: service.name,
      duration_min: 30 + (index % 3) * 15,
      duration_minutes: 30 + (index % 3) * 15,
      price: 35 + businessIndex * 5 + index * 10,
      active: true,
      catalog_service_id: service.id,
      icon_key: service.icon_key,
    }));

  if (services.length) {
    const { error } = await supabase.from("services").insert(services);
    if (error) throw error;
    servicesCreated += services.length;
  }

  for (const [professionalIndex, name] of item.professionals.entries()) {
    const email = `demo.${item.slug}.${professionalIndex + 1}@gohub.app`.toLowerCase();
    const phone = `1698${String(businessIndex + 20).padStart(2, "0")}${String(professionalIndex + 1).padStart(2, "0")}00`;
    let authUser = usersByEmail.get(email);

    if (!authUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: `Demo-${randomUUID()}-A1!`,
        email_confirm: true,
        user_metadata: { name, phone, role: "barber", barbershop_id: businessId, demo: true },
      });
      if (error) throw error;
      authUser = data.user;
      usersByEmail.set(email, authUser);
    }

    const avatarNumber = 20 + businessIndex * 4 + professionalIndex;
    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: authUser.id,
        barbershop_id: businessId,
        role: "barber",
        name,
        phone,
        avatar_url: `https://i.pravatar.cc/300?img=${avatarNumber}`,
      },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;

    const { data: existingBarber, error: barberFindError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (barberFindError) throw barberFindError;

    const barberPayload = {
      user_id: authUser.id,
      barbershop_id: businessId,
      bio: "Profissional de estética e cuidados Pet.",
      commission_pct: 45 + professionalIndex * 5,
      active: true,
    };

    if (existingBarber?.id) {
      const { error } = await supabase.from("barbers").update(barberPayload).eq("id", existingBarber.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("barbers").insert(barberPayload);
      if (error) throw error;
      professionalsCreated += 1;
    }
  }
}

for (const item of retailBusinesses) {
  await upsertBusiness(item, ["Rações e acessórios"]);
}

console.log(JSON.stringify({ businessesCreated, servicesCreated, professionalsCreated }, null, 2));
