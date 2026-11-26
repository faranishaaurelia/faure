// Generator PDF untuk nota. Modul ini hanya dipanggil dari klien; jspdf
// di-import secara dinamis supaya tidak ikut dievaluasi saat SSR.

import type { jsPDF } from "jspdf";
import { notaFilename, type NotaData, type NotaItem, type NotaLabels } from "@/lib/nota";
import { rupiah } from "@/lib/orders";

type RGB = [number, number, number];
type TextOptions = { align?: "left" | "center" | "right" | "justify" };

type Kolom = {
  key: "no" | "product" | "qty" | "price" | "amount";
  lebar: number;
  label: string;
};

const INK: RGB = [30, 28, 24];
const MUTED: RGB = [138, 129, 120];
const ACCENT: RGB = [154, 123, 105];
const GARIS: RGB = [231, 227, 220];
const CREAM: RGB = [247, 243, 238];

const TEPI = 16;
const LEBAR_HALAMAN = 210;
const LEBAR_ISI = LEBAR_HALAMAN - TEPI * 2;
const BATAS_BAWAH = 255;

// Helvetica bawaan jsPDF memakai WinAnsi. Karakter typographic dari dictionary
// (en dash, curly quote, dll.) diganti supaya tidak keluar sebagai kotak.
function aman(teks: string) {
  return String(teks ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/×/g, "x")
    .replace(/•/g, "-")
    .replace(/…/g, "...");
}

function tulis(
  doc: jsPDF,
  teks: string,
  x: number,
  y: number,
  opsi?: TextOptions,
) {
  doc.text(aman(teks), x, y, opsi);
}

function potong(doc: jsPDF, teks: string, lebar: number) {
  return doc.splitTextToSize(aman(teks), lebar) as string[];
}

function blok(
  doc: jsPDF,
  teks: string,
  x: number,
  y: number,
  lebar: number,
  tinggiGaris = 4.4,
) {
  const baris = potong(doc, teks, lebar);
  baris.forEach((barisTeks, i) => tulis(doc, barisTeks, x, y + i * tinggiGaris));
  return y + baris.length * tinggiGaris;
}

function garis(doc: jsPDF, y: number, warna: RGB = GARIS) {
  doc.setDrawColor(...warna);
  doc.setLineWidth(0.2);
  doc.line(TEPI, y, LEBAR_HALAMAN - TEPI, y);
}

function labelKecil(doc: jsPDF, teks: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...ACCENT);
  tulis(doc, teks, x, y);
}

function kepala(
  doc: jsPDF,
  data: NotaData,
  labels: NotaLabels,
  judul: string,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  tulis(doc, labels.brand, TEPI, 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  tulis(doc, labels.tagline, TEPI, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...ACCENT);
  tulis(doc, judul.toUpperCase(), LEBAR_HALAMAN - TEPI, 22, { align: "right" });

  doc.setFontSize(12);
  doc.setTextColor(...INK);
  tulis(doc, data.kode, LEBAR_HALAMAN - TEPI, 29, { align: "right" });

  garis(doc, 35);
  return 43;
}

function barisInfo(
  doc: jsPDF,
  label: string,
  nilai: string,
  x: number,
  y: number,
  lebarNilai: number,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  tulis(doc, label, x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  return blok(doc, nilai || "-", x, y + 4.2, lebarNilai);
}

function infoPembayaran(
  doc: jsPDF,
  data: NotaData,
  labels: NotaLabels,
  y: number,
) {
  const xKiri = TEPI;
  const xKanan = TEPI + 96;
  const lebarKiri = 84;
  const lebarKanan = LEBAR_ISI - 96;

  labelKecil(doc, labels.billTo, xKiri, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  let yKiri = blok(doc, data.customerName, xKiri, y + 6, lebarKiri) + 1;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  if (data.customerEmail) {
    yKiri = blok(doc, data.customerEmail, xKiri, yKiri, lebarKiri) + 0.5;
  }
  if (data.customerPhone) {
    yKiri = blok(doc, data.customerPhone, xKiri, yKiri, lebarKiri);
  }

  let yKanan = y;
  yKanan =
    barisInfo(doc, labels.orderDate, data.createdAt, xKanan, yKanan, lebarKanan) +
    2.5;
  yKanan =
    barisInfo(
      doc,
      labels.paidOn,
      data.paidAt ?? labels.notAvailable,
      xKanan,
      yKanan,
      lebarKanan,
    ) + 2.5;
  yKanan =
    barisInfo(doc, labels.status, data.paymentStatus, xKanan, yKanan, lebarKanan) +
    2.5;
  yKanan =
    barisInfo(
      doc,
      labels.transactionId,
      data.transactionId ?? labels.notAvailable,
      xKanan,
      yKanan,
      lebarKanan,
    ) + 2;

  return Math.max(yKiri, yKanan) + 2;
}

function infoPengiriman(
  doc: jsPDF,
  data: NotaData,
  labels: NotaLabels,
  y: number,
) {
  const xKiri = TEPI;
  const xKanan = TEPI + 96;
  const lebarKiri = 84;
  const lebarKanan = LEBAR_ISI - 96;

  labelKecil(doc, labels.shipTo, xKiri, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  let yKiri = blok(
    doc,
    data.recipient || data.customerName,
    xKiri,
    y + 6,
    lebarKiri,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  data.addressLines.forEach((baris) => {
    yKiri = blok(doc, baris, xKiri, yKiri, lebarKiri) + 0.4;
  });

  if (data.recipientPhone) {
    doc.setTextColor(...MUTED);
    yKiri = blok(
      doc,
      `${labels.phone}: ${data.recipientPhone}`,
      xKiri,
      yKiri + 1,
      lebarKiri,
    );
  }

  let yKanan = y;
  yKanan =
    barisInfo(
      doc,
      labels.orderDate,
      data.createdAt,
      xKanan,
      yKanan,
      lebarKanan,
    ) + 2.5;
  yKanan =
    barisInfo(
      doc,
      labels.shippingMethod,
      data.shippingMethod,
      xKanan,
      yKanan,
      lebarKanan,
    ) + 2.5;
  yKanan =
    barisInfo(
      doc,
      labels.trackingNumber,
      data.trackingNumber ?? labels.notAvailable,
      xKanan,
      yKanan,
      lebarKanan,
    ) + 2.5;
  yKanan =
    barisInfo(
      doc,
      labels.paymentMethod,
      data.paymentMethod,
      xKanan,
      yKanan,
      lebarKanan,
    ) + 2;

  return Math.max(yKiri, yKanan) + 2;
}

function posisiKolom(kolom: Kolom[], index: number) {
  return (
    TEPI + kolom.slice(0, index).reduce((jumlah, k) => jumlah + k.lebar, 0)
  );
}

function kepalaTabel(doc: jsPDF, kolom: Kolom[], y: number) {
  doc.setFillColor(...CREAM);
  doc.rect(TEPI, y, LEBAR_ISI, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  kolom.forEach((k, i) => {
    const x = posisiKolom(kolom, i) + 1.5;
    const opsi: TextOptions | undefined =
      k.key === "qty" || k.key === "price" || k.key === "amount"
        ? { align: "right" }
        : undefined;
    tulis(
      doc,
      k.label.toUpperCase(),
      opsi ? x + k.lebar - 3 : x,
      y + 5.2,
      opsi,
    );
  });

  return y + 8;
}

function teksItem(item: NotaItem) {
  return item.detail ? `${item.nama} - ${item.detail}` : item.nama;
}

function tabelItem(
  doc: jsPDF,
  data: NotaData,
  labels: NotaLabels,
  judul: string,
  kolom: Kolom[],
  yAwal: number,
) {
  let y = kepalaTabel(doc, kolom, yAwal);

  data.items.forEach((item, index) => {
    const lebarProduk = kolom.find((k) => k.key === "product")?.lebar ?? 86;
    const barisNama = potong(doc, teksItem(item), lebarProduk - 4);
    const tinggiBaris = Math.max(8, barisNama.length * 4.2 + 4);

    if (y + tinggiBaris > BATAS_BAWAH) {
      doc.addPage();
      y = kepala(doc, data, labels, judul);
      y = kepalaTabel(doc, kolom, y);
    }

    if (index % 2 === 1) {
      doc.setFillColor(250, 248, 245);
      doc.rect(TEPI, y, LEBAR_ISI, tinggiBaris, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);

    kolom.forEach((k, i) => {
      const x = posisiKolom(kolom, i);
      if (k.key === "no") {
        tulis(doc, String(index + 1), x + 2, y + 5.2);
      } else if (k.key === "product") {
        barisNama.forEach((baris, n) =>
          tulis(doc, baris, x + 1.5, y + 5 + n * 4.2),
        );
      } else if (k.key === "qty") {
        tulis(doc, String(item.jumlah), x + k.lebar - 2, y + 5.2, {
          align: "right",
        });
      } else if (k.key === "price") {
        tulis(doc, rupiah(item.harga), x + k.lebar - 2, y + 5.2, {
          align: "right",
        });
      } else if (k.key === "amount") {
        tulis(doc, rupiah(item.total), x + k.lebar - 2, y + 5.2, {
          align: "right",
        });
      }
    });

    garis(doc, y + tinggiBaris);
    y += tinggiBaris;
  });

  return y + 4;
}

function ringkasan(
  doc: jsPDF,
  data: NotaData,
  labels: NotaLabels,
  judul: string,
  y: number,
) {
  if (y + 38 > BATAS_BAWAH) {
    doc.addPage();
    y = kepala(doc, data, labels, judul);
  }

  const kanan = LEBAR_HALAMAN - TEPI;
  const xLabel = kanan - 88;
  let baris = y;

  const pasang = (label: string, nilai: string, tebal = false) => {
    doc.setFont("helvetica", tebal ? "bold" : "normal");
    doc.setFontSize(tebal ? 10.5 : 9);
    doc.setTextColor(...(tebal ? INK : MUTED));
    tulis(doc, label, xLabel, baris);
    doc.setTextColor(...INK);
    tulis(doc, nilai, kanan, baris, { align: "right" });
    baris += tebal ? 8 : 6;
  };

  pasang(labels.subtotal, rupiah(data.subtotal));
  pasang(labels.shippingCost, rupiah(data.shippingCost));
  if (data.discount > 0) {
    pasang(
      `${labels.discount}${data.voucherCode ? ` (${data.voucherCode})` : ""}`,
      `-${rupiah(data.discount)}`,
    );
  }

  garis(doc, baris - 1);
  baris += 3;
  pasang(labels.total, rupiah(data.total), true);

  return baris + 2;
}

function catatan(
  doc: jsPDF,
  data: NotaData,
  labels: NotaLabels,
  judul: string,
  label: string,
  isi: string,
  y: number,
) {
  if (y + 20 > BATAS_BAWAH) {
    doc.addPage();
    y = kepala(doc, data, labels, judul);
  }
  labelKecil(doc, label, TEPI, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  return blok(doc, isi, TEPI, y + 5, LEBAR_ISI) + 4;
}

function tandaTangan(doc: jsPDF, labels: NotaLabels, y: number) {
  if (y + 26 > BATAS_BAWAH) {
    doc.addPage();
    y = 50;
  }

  const lebar = 78;
  const kanan = TEPI + LEBAR_ISI - lebar;
  const garisTtd = y + 20;

  doc.setDrawColor(...GARIS);
  doc.setLineWidth(0.3);
  doc.line(TEPI, garisTtd, TEPI + lebar, garisTtd);
  doc.line(kanan, garisTtd, kanan + lebar, garisTtd);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  tulis(doc, labels.senderSignature, TEPI, garisTtd + 4.5);
  tulis(doc, labels.receiverSignature, kanan, garisTtd + 4.5);

  return garisTtd + 9;
}

function kaki(doc: jsPDF, data: NotaData, labels: NotaLabels) {
  for (let halaman = 1; halaman <= doc.getNumberOfPages(); halaman++) {
    doc.setPage(halaman);
    garis(doc, 278);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    tulis(
      doc,
      `${labels.printedOn}: ${data.printedAt}`,
      TEPI,
      284,
    );
    tulis(
      doc,
      `${labels.thankYou}  |  ${halaman}/${doc.getNumberOfPages()}`,
      LEBAR_HALAMAN - TEPI,
      284,
      { align: "right" },
    );
  }
}

export async function unduhNotaPdf(data: NotaData, labels: NotaLabels) {
  const { jsPDF: Pdf } = await import("jspdf");
  const doc = new Pdf({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setProperties({
    title: `${labels.paymentTitle} - ${data.kode}`,
    subject: `${labels.paymentTitle} & ${labels.shippingTitle}`,
  });

  // ---------- Nota pembayaran ----------
  let y = kepala(doc, data, labels, labels.paymentTitle);
  y = infoPembayaran(doc, data, labels, y);

  const kolomBayar: Kolom[] = [
    { key: "no", lebar: 10, label: labels.no },
    { key: "product", lebar: 86, label: labels.product },
    { key: "qty", lebar: 14, label: labels.qty },
    { key: "price", lebar: 34, label: labels.price },
    { key: "amount", lebar: 34, label: labels.amount },
  ];
  y = tabelItem(doc, data, labels, labels.paymentTitle, kolomBayar, y);
  y = ringkasan(doc, data, labels, labels.paymentTitle, y);
  catatan(
    doc,
    data,
    labels,
    labels.paymentTitle,
    labels.notes,
    labels.paymentNote,
    y,
  );

  // ---------- Nota pengiriman ----------
  doc.addPage();
  y = kepala(doc, data, labels, labels.shippingTitle);
  y = infoPengiriman(doc, data, labels, y);

  const kolomKirim: Kolom[] = [
    { key: "no", lebar: 12, label: labels.no },
    { key: "product", lebar: 126, label: labels.product },
    { key: "qty", lebar: 40, label: labels.qty },
  ];
  y = tabelItem(doc, data, labels, labels.shippingTitle, kolomKirim, y);

  const totalQty = data.items.reduce((n, i) => n + i.jumlah, 0);
  if (y > BATAS_BAWAH) {
    doc.addPage();
    y = kepala(doc, data, labels, labels.shippingTitle);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  tulis(
    doc,
    `${labels.qty}: ${totalQty}`,
    LEBAR_HALAMAN - TEPI,
    y,
    { align: "right" },
  );
  y += 6;

  y = catatan(
    doc,
    data,
    labels,
    labels.shippingTitle,
    labels.notes,
    [labels.shippingNote, data.shippingNotes]
      .filter(Boolean)
      .join(" "),
    y,
  );
  tandaTangan(doc, labels, y);

  kaki(doc, data, labels);
  doc.save(notaFilename(data));
}
