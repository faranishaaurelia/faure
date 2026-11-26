// Data dan label untuk nota pembayaran & pengiriman.
// Semua nilai sudah berupa string/angka sederhana supaya aman dikirim dari
// Server Component ke komponen klien (cetak / unduh PDF).

export type NotaItem = {
  nama: string;
  detail: string;
  jumlah: number;
  harga: number;
  total: number;
};

export type NotaData = {
  id: number;
  kode: string;
  createdAt: string;
  paidAt: string | null;
  printedAt: string;
  transactionId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  paymentMethod: string;
  paymentStatus: string;
  shippingMethod: string;
  trackingNumber: string | null;
  recipient: string | null;
  recipientPhone: string | null;
  addressLines: string[];
  shippingNotes: string | null;
  items: NotaItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  voucherCode: string | null;
};

export type NotaLabels = {
  brand: string;
  tagline: string;
  paymentTitle: string;
  shippingTitle: string;
  orderCode: string;
  orderDate: string;
  paidOn: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  billTo: string;
  shipTo: string;
  recipient: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  item: string;
  no: string;
  product: string;
  variant: string;
  qty: string;
  price: string;
  amount: string;
  subtotal: string;
  shippingCost: string;
  discount: string;
  total: string;
  voucher: string;
  shippingMethod: string;
  trackingNumber: string;
  paymentNote: string;
  shippingNote: string;
  thankYou: string;
  printedOn: string;
  senderSignature: string;
  receiverSignature: string;
  print: string;
  download: string;
  downloading: string;
  downloadError: string;
  backToOrder: string;
  unavailableTitle: string;
  unavailableBody: string;
  printHint: string;
  notAvailable: string;
};

type Translator = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export function notaLabels(t: Translator): NotaLabels {
  return {
    brand: "FAURE",
    tagline: t("nota.tagline"),
    paymentTitle: t("nota.paymentTitle"),
    shippingTitle: t("nota.shippingTitle"),
    orderCode: t("checkout.orderCode"),
    orderDate: t("nota.orderDate"),
    paidOn: t("nota.paidOn"),
    status: t("account.status"),
    paymentMethod: t("nota.paymentMethod"),
    transactionId: t("nota.transactionId"),
    billTo: t("nota.billTo"),
    shipTo: t("nota.shipTo"),
    recipient: t("nota.recipient"),
    phone: t("nota.phone"),
    email: t("nota.email"),
    address: t("nota.address"),
    notes: t("nota.notes"),
    item: t("checkout.items"),
    no: t("nota.no"),
    product: t("nota.product"),
    variant: t("nota.variant"),
    qty: t("nota.qty"),
    price: t("nota.price"),
    amount: t("nota.amount"),
    subtotal: t("checkout.subtotal"),
    shippingCost: t("checkout.shippingCost"),
    discount: t("checkout.discount"),
    total: t("checkout.total"),
    voucher: t("nota.voucher"),
    shippingMethod: t("nota.shippingMethod"),
    trackingNumber: t("account.trackingNumber"),
    paymentNote: t("nota.paymentNote"),
    shippingNote: t("nota.shippingNote"),
    thankYou: t("nota.thankYou"),
    printedOn: t("nota.printedOn"),
    senderSignature: t("nota.senderSignature"),
    receiverSignature: t("nota.receiverSignature"),
    print: t("nota.print"),
    download: t("nota.download"),
    downloading: t("nota.downloading"),
    downloadError: t("nota.downloadError"),
    backToOrder: t("nota.backToOrder"),
    unavailableTitle: t("nota.unavailableTitle"),
    unavailableBody: t("nota.unavailableBody"),
    printHint: t("nota.printHint"),
    notAvailable: t("account.notAvailable"),
  };
}

export function notaFilename(data: NotaData) {
  const aman = data.kode.replace(/[^A-Za-z0-9-]/g, "-");
  return `Nota-${aman}.pdf`;
}
