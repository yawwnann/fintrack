// scripts/seed.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- KONFIGURASI BARU ---
const USER_ID_TO_SEED = "6835b5a1d06d04c4f68e5dcf";
const ACCOUNT_ID_TO_SEED = "684039393823c55f6f9f4725"; // <-- PASTIKAN INI MASIH VALID
const DAYS_TO_GENERATE = 30;
// Target total pengeluaran selama 30 hari
const TARGET_TOTAL_EXPENSE = 5_000_000;
// Perkiraan jumlah transaksi yang akan dibuat selama 30 hari
const APPROX_NUM_TRANSACTIONS = 55;

// --- KUMPULAN KATEGORI DAN DESKRIPSI (TETAP SAMA) ---
const categories = [
  {
    name: "Makan",
    descriptions: [
      "Makan siang nasi padang",
      "Beli kopi susu",
      "Sarapan bubur ayam",
      "Makan malam sate",
      "Beli cemilan di minimarket",
    ],
  },
  {
    name: "Transportasi",
    descriptions: [
      "Naik ojek online ke kantor",
      "Isi bensin Pertamax",
      "Bayar parkir motor",
      "Naik KRL",
      "Top up e-money untuk transport",
    ],
  },
  {
    name: "Groceries",
    descriptions: [
      "Belanja bulanan di supermarket",
      "Beli sayur di pasar",
      "Beli buah-buahan",
      "Beli telur dan susu",
    ],
  },
  {
    name: "Tagihan",
    descriptions: [
      "Bayar tagihan listrik",
      "Bayar tagihan internet",
      "Bayar tagihan air PDAM",
      "Iuran lingkungan",
    ],
  },
  {
    name: "Hiburan",
    descriptions: [
      "Nonton film di bioskop XXI",
      "Langganan Netflix",
      "Beli game di Steam",
      "Main bowling bersama teman",
    ],
  },
  {
    name: "Kesehatan",
    descriptions: [
      "Beli obat batuk di apotek",
      "Periksa ke dokter umum",
      "Beli vitamin C",
      "Terapi pijat",
    ],
  },
  {
    name: "Sosial",
    descriptions: [
      "Kado ulang tahun teman",
      "Traktir makan teman",
      "Sumbangan acara sosial",
    ],
  },
  {
    name: "Pendidikan",
    descriptions: [
      "Beli buku programming baru",
      "Ikut kursus online",
      "Beli alat tulis",
    ],
  },
  {
    name: "Cicilan",
    descriptions: [
      "Bayar cicilan KPR",
      "Bayar cicilan motor",
      "Bayar cicilan handphone",
    ],
  },
  {
    name: "Transfer",
    descriptions: [
      "Transfer ke rekening orang tua",
      "Transfer untuk bayar utang",
      "Kirim uang ke teman",
    ],
  },
  {
    name: "Lain-lain",
    descriptions: [
      "Potong rambut",
      "Beli pulsa",
      "Servis laptop",
      "Beli baju baru",
    ],
  },
];

async function main() {
  if (ACCOUNT_ID_TO_SEED.includes("ganti_dengan")) {
    console.error(
      "❌ HARAP UBAH NILAI 'ACCOUNT_ID_TO_SEED' DI DALAM SCRIPT seed.ts!"
    );
    return;
  }

  console.log("🚀 Memulai proses seeding data dummy...");
  console.log(
    `🧹 Menghapus data expense lama untuk user: ${USER_ID_TO_SEED}...`
  );
  await prisma.expense.deleteMany({ where: { userId: USER_ID_TO_SEED } });

  const expensesToCreate = [];

  // --- LOGIKA BARU UNTUK MEMBUAT TRANSAKSI DENGAN TOTAL TERTENTU ---
  console.log(
    `🌱 Membuat ~${APPROX_NUM_TRANSACTIONS} transaksi dengan total pengeluaran ~Rp ${TARGET_TOTAL_EXPENSE.toLocaleString(
      "id-ID"
    )}`
  );

  // 1. Buat "porsi" atau "bobot" acak untuk setiap transaksi
  const weights = Array.from({ length: APPROX_NUM_TRANSACTIONS }, () =>
    Math.random()
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // 2. Buat daftar jumlah pengeluaran berdasarkan bobot, yang totalnya sama dengan TARGET_TOTAL_EXPENSE
  const amounts = weights.map((w) =>
    Math.round((w / totalWeight) * TARGET_TOTAL_EXPENSE)
  );

  // 3. Sebar transaksi-transaksi ini secara acak selama 30 hari terakhir
  for (const amount of amounts) {
    // Jangan buat transaksi dengan nilai 0
    if (amount === 0) continue;

    const randomDaysAgo = Math.floor(Math.random() * DAYS_TO_GENERATE);
    const expenseDate = new Date();
    expenseDate.setDate(expenseDate.getDate() - randomDaysAgo);
    expenseDate.setHours(
      Math.floor(Math.random() * 24),
      Math.floor(Math.random() * 60)
    );

    const randomCategoryObject =
      categories[Math.floor(Math.random() * categories.length)];
    const randomDescription =
      randomCategoryObject.descriptions[
        Math.floor(Math.random() * randomCategoryObject.descriptions.length)
      ];

    expensesToCreate.push({
      amount,
      date: expenseDate,
      userId: USER_ID_TO_SEED,
      accountId: ACCOUNT_ID_TO_SEED,
      category: randomCategoryObject.name,
      description: randomDescription,
    });
  }

  if (expensesToCreate.length > 0) {
    const totalGenerated = expensesToCreate.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    console.log(
      `💾 Menyimpan ${expensesToCreate.length} data expense baru ke database...`
    );
    console.log(
      `💰 Total pengeluaran yang dibuat: Rp ${totalGenerated.toLocaleString(
        "id-ID"
      )}`
    );

    await prisma.expense.createMany({ data: expensesToCreate });
    console.log("✅ Proses seeding berhasil diselesaikan!");
  } else {
    console.log("Tidak ada data dummy yang dibuat kali ini.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Terjadi error saat proses seeding:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
