#!/usr/bin/env node
/* eslint-disable no-console -- a saída no terminal é o produto deste script. */
import process from 'node:process';
/**
 * Popula o emulador com uma turma fictícia: membros com perfis completos,
 * encontros passados e futuros, confirmações de presença e anúncios na
 * vitrine. Serve para ver a interface com dado de verdade e para exercitar o
 * cruzamento por IA, que precisa de perfis plausíveis para produzir algo
 * verificável.
 *
 * NÃO roda contra produção: o script recusa se as variáveis de emulador não
 * estiverem definidas — semear dado fictício no banco real é irreversível.
 *
 * Uso (com `pnpm emulators:start` rodando em outro terminal):
 *   pnpm seed:dev-data
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('❌ Este script só roda contra os emuladores.');
  console.error('   Rode `pnpm emulators:start` e use `pnpm seed:dev-data`.');
  process.exit(1);
}

initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-manualdedonos-rj' });

const auth = getAuth();
const db = getFirestore();

const SENHA_PADRAO = 'Donos@2026';

const MEMBROS = [
  {
    email: 'admin@manualdedonos.com.br',
    displayName: 'Ana Ribeiro',
    role: 99,
    company: { name: 'Manual de Donos', segment: 'Educação executiva', position: 'Organizadora', city: 'Rio de Janeiro', site: '', revenueRange: '', headcount: '8' },
    bio: 'Organizo a master class e conduzo os encontros.',
    offers: ['mentoria de gestão', 'curadoria de conteúdo'],
    needs: ['parcerias para patrocínio dos encontros'],
  },
  {
    email: 'carlos@friopremium.com.br',
    displayName: 'Carlos Menezes',
    role: 1,
    company: { name: 'Frio Premium Logística', segment: 'Logística refrigerada', position: 'Sócio-diretor', city: 'Duque de Caxias', site: 'https://friopremium.com.br', revenueRange: 'R$ 18 mi/ano', headcount: '90' },
    bio: 'Armazenagem e transporte refrigerado para food service na Baixada e Grande Rio.',
    offers: ['armazenagem refrigerada em Duque de Caxias', 'transporte com controle de temperatura', 'operação de last mile para alimentos'],
    needs: ['clientes de food service', 'software de roteirização', 'crédito para renovar frota'],
  },
  {
    email: 'juliana@sabordacasa.com.br',
    displayName: 'Juliana Prado',
    role: 1,
    company: { name: 'Sabor da Casa Alimentos', segment: 'Indústria de alimentos congelados', position: 'CEO', city: 'Nova Iguaçu', site: '', revenueRange: 'R$ 12 mi/ano', headcount: '60' },
    bio: 'Produzimos pratos congelados para redes de supermercado do estado do Rio.',
    offers: ['private label de congelados', 'desenvolvimento de receitas'],
    needs: ['armazenagem refrigerada', 'representante comercial para o interior', 'embalagem sustentável'],
  },
  {
    email: 'rafael@contafacil.com.br',
    displayName: 'Rafael Tavares',
    role: 1,
    company: { name: 'ContaFácil Contabilidade', segment: 'Contabilidade e fiscal', position: 'Sócio', city: 'Rio de Janeiro', site: '', revenueRange: 'R$ 4 mi/ano', headcount: '25' },
    bio: 'Contabilidade consultiva para indústrias e transportadoras de médio porte.',
    offers: ['revisão tributária para o Lucro Real', 'recuperação de créditos de PIS/COFINS', 'BPO financeiro'],
    needs: ['clientes industriais', 'sistema de gestão de documentos'],
  },
  {
    email: 'marina@pulsodigital.com.br',
    displayName: 'Marina Câmara',
    role: 1,
    company: { name: 'Pulso Digital', segment: 'Marketing B2B', position: 'Fundadora', city: 'Niterói', site: '', revenueRange: 'R$ 3 mi/ano', headcount: '18' },
    bio: 'Geração de demanda B2B para indústria e serviços técnicos.',
    offers: ['prospecção outbound', 'posicionamento de marca industrial', 'gestão de time comercial'],
    needs: ['contabilidade consultiva', 'parceiros para vender no B2B'],
  },
  {
    email: 'pedro@embalarj.com.br',
    displayName: 'Pedro Bastos',
    role: 1,
    company: { name: 'Embala RJ', segment: 'Embalagens sustentáveis', position: 'Diretor comercial', city: 'São Gonçalo', site: '', revenueRange: 'R$ 9 mi/ano', headcount: '45' },
    bio: 'Embalagens recicláveis para alimentos e e-commerce.',
    offers: ['embalagem sustentável para alimentos', 'linha personalizada de caixas'],
    needs: ['indústrias de alimentos', 'operador logístico parceiro'],
  },
];

const AGORA = new Date();

function diasAPartirDeHoje(dias, hora = '19:30') {
  const data = new Date(AGORA.getTime() + dias * 24 * 60 * 60 * 1000);
  const iso = data.toISOString().slice(0, 10);
  return `${iso}T${hora}:00-03:00`;
}

const ENCONTROS = [
  {
    id: 'modulo-01',
    title: 'Módulo 1 — Diagnóstico do Dono',
    topic: 'Módulo 1',
    description: 'Abertura da turma: onde cada empresa está e o que trava o crescimento.',
    startsAt: diasAPartirDeHoje(-45),
    status: 'realizado',
  },
  {
    id: 'modulo-02',
    title: 'Módulo 2 — Gestão de Caixa e Margem',
    topic: 'Módulo 2',
    description: 'Como ler o caixa da empresa sem depender do contador para entender o mês.',
    startsAt: diasAPartirDeHoje(-14),
    status: 'realizado',
  },
  {
    id: 'modulo-03',
    title: 'Módulo 3 — Time Comercial que Vende Sozinho',
    topic: 'Módulo 3',
    description: 'Estrutura, metas e rotina de um time comercial B2B que não depende do dono.',
    startsAt: diasAPartirDeHoje(9),
    status: 'agendado',
  },
  {
    id: 'modulo-04',
    title: 'Módulo 4 — Sucessão e Sociedade',
    topic: 'Módulo 4',
    description: 'Acordo de sócios, sucessão familiar e governança para empresas de médio porte.',
    startsAt: diasAPartirDeHoje(37),
    status: 'agendado',
  },
];

const LOCAL = {
  name: 'Sede do grupo — Botafogo',
  address: 'Rua Voluntários da Pátria, 100 — Botafogo, Rio de Janeiro',
  mapsUrl: '',
};

async function criarMembro(dados) {
  let user;

  try {
    user = await auth.getUserByEmail(dados.email);
  }
  catch {
    user = await auth.createUser({
      email: dados.email,
      password: SENHA_PADRAO,
      displayName: dados.displayName,
      emailVerified: true,
    });
  }

  await db.collection('members').doc(user.uid).set({
    uid: user.uid,
    email: dados.email,
    displayName: dados.displayName,
    photoURL: '',
    phone: '',
    role: dados.role,
    approved: true,
    bio: dados.bio,
    company: dados.company,
    offers: dados.offers,
    needs: dados.needs,
    linkedin: '',
    instagram: '',
    aiOptOut: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ...dados, uid: user.uid };
}

const criados = [];
for (const dados of MEMBROS)
  criados.push(await criarMembro(dados));

for (const encontro of ENCONTROS) {
  await db.collection('events').doc(encontro.id).set({
    title: encontro.title,
    topic: encontro.topic,
    description: encontro.description,
    startsAt: encontro.startsAt,
    durationMinutes: 150,
    location: LOCAL,
    speaker: 'Ana Ribeiro',
    coverUrl: '',
    capacity: 30,
    status: encontro.status,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Confirmações para o próximo encontro, variadas de propósito: a tela precisa
// ser vista com confirmados, "talvez" e ausentes ao mesmo tempo.
const proximo = ENCONTROS.find(encontro => encontro.status === 'agendado');
const RESPOSTAS = ['confirmado', 'confirmado', 'confirmado', 'talvez', 'ausente'];

for (const [index, membro] of criados.slice(1).entries()) {
  const status = RESPOSTAS[index % RESPOSTAS.length];

  await db.collection('rsvps').doc(`${proximo.id}_${membro.uid}`).set({
    eventId: proximo.id,
    uid: membro.uid,
    memberName: membro.displayName,
    memberCompany: membro.company.name,
    status,
    guests: status === 'confirmado' && index === 0 ? 1 : 0,
    note: status === 'talvez' ? 'Depende de uma viagem que ainda não confirmei.' : '',
    updatedAt: FieldValue.serverTimestamp(),
  });
}

const VITRINE = [
  { ownerEmail: 'rafael@contafacil.com.br', title: 'Revisão tributária para indústrias no Lucro Real', category: 'Contabilidade & Fiscal', description: 'Levantamento de créditos de PIS/COFINS e reenquadramento fiscal. Média de 6% de redução na carga.', memberBenefit: 'Diagnóstico inicial gratuito para membros da turma.', priceHint: 'a partir de R$ 3.500' },
  { ownerEmail: 'marina@pulsodigital.com.br', title: 'Estruturação de prospecção outbound B2B', category: 'Marketing & Vendas', description: 'Montagem de lista, cadência e time de pré-vendas para quem vende para outras empresas.', memberBenefit: '20% de desconto no primeiro trimestre.', priceHint: 'R$ 8.000/mês' },
  { ownerEmail: 'carlos@friopremium.com.br', title: 'Armazenagem refrigerada em Duque de Caxias', category: 'Logística & Operações', description: '2.400 posições-palete com controle de temperatura de -25°C a 10°C e operação 24h.', memberBenefit: 'Primeiro mês de armazenagem sem custo de setup.', priceHint: 'sob consulta' },
  { ownerEmail: 'pedro@embalarj.com.br', title: 'Embalagem reciclável para alimentos congelados', category: 'Indústria & Fornecimento', description: 'Linha de embalagens recicláveis homologadas para contato com alimentos.', memberBenefit: 'Amostras e prototipagem sem custo.', priceHint: '' },
];

for (const anuncio of VITRINE) {
  const dono = criados.find(membro => membro.email === anuncio.ownerEmail);

  await db.collection('services').add({
    ownerUid: dono.uid,
    ownerName: dono.displayName,
    ownerCompany: dono.company.name,
    title: anuncio.title,
    description: anuncio.description,
    category: anuncio.category,
    memberBenefit: anuncio.memberBenefit,
    priceHint: anuncio.priceHint,
    whatsapp: '21999990000',
    email: dono.email,
    site: dono.company.site,
    coverUrl: '',
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

console.log('✅ Emulador populado.');
console.log(`   ${criados.length} membros, ${ENCONTROS.length} encontros, ${VITRINE.length} anúncios.`);
console.log(`   Senha de todos os logins: ${SENHA_PADRAO}`);
console.log('   Admin: admin@manualdedonos.com.br');
console.log('   Obs.: o mural começa vazio — fotos precisam ser enviadas pela interface.');
