import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KOLOM_MESSAGE, type ChatMessage } from "@/lib/chat";
import { ensureConversation } from "@/lib/actions/chat";
import ProductChatHistoryView, {
  type ConversationItem,
  type ProductChatInfo,
} from "@/components/chat/ProductChatHistoryView";

export const dynamic = "force-dynamic";

type RawConversation = {
  id: number;
  context_type: string;
  context_id: number;
  user_id: string;
  created_at: string;
  last_message_at: string | null;
};

type RawProduct = {
  id: number;
  name: string;
  base_price: number | string;
  categories: { name: string } | { name: string }[] | null;
  product_images: { url: string; sort_order: number }[] | null;
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function UserProductChatPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; id?: string; conv?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Cek jika ada query param conv / id
  let requestedConvId: number | null = null;
  if (params.conv) {
    requestedConvId = Number(params.conv);
  } else if (params.id) {
    requestedConvId = Number(params.id);
  }

  // 1. Ambil semua percakapan produk milik user
  const { data: rawConvs } = await supabase
    .from("conversations")
    .select("id, context_type, context_id, user_id, created_at, last_message_at")
    .eq("user_id", user.id)
    .eq("context_type", "product")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const conversations = (rawConvs ?? []) as RawConversation[];

  if (params.product) {
    const pId = Number(params.product);
    const match = conversations.find((c) => c.context_id === pId);
    if (match) {
      requestedConvId = match.id;
    }
  }

  // 2. Ambil data produk
  const productIds = [
    ...new Set(conversations.map((c) => c.context_id)),
  ];

  const { data: rawProducts } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select(
            `
            id,
            name,
            base_price,
            categories ( name ),
            product_images ( url, sort_order )
          `,
          )
          .in("id", productIds)
      : { data: [] };

  const productsMap = new Map<number, ProductChatInfo>();
  for (const raw of (rawProducts ?? []) as unknown as RawProduct[]) {
    const category = satu(raw.categories);
    const images = (raw.product_images ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const firstImage = images[0]?.url ?? null;

    productsMap.set(raw.id, {
      id: raw.id,
      name: raw.name,
      base_price: Number(raw.base_price) || 0,
      categoryName: category?.name ?? null,
      imageUrl: firstImage,
    });
  }

  // 3. Ambil semua pesan untuk percakapan-percakapan tersebut
  const convIds = conversations.map((c) => c.id);
  const { data: rawMessages } =
    convIds.length > 0
      ? await supabase
          .from("messages")
          .select(KOLOM_MESSAGE)
          .in("conversation_id", convIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const messagesMap = new Map<number, ChatMessage[]>();
  for (const msg of (rawMessages ?? []) as ChatMessage[]) {
    const arr = messagesMap.get(msg.conversation_id) ?? [];
    arr.push(msg);
    messagesMap.set(msg.conversation_id, arr);
  }

  // 4. Susun daftar ConversationItem yang siap dipakai di UI (hanya yang memiliki pesan)
  const conversationItems: ConversationItem[] = conversations
    .map((c) => {
      const msgs = messagesMap.get(c.id) ?? [];
      const lastMsg = msgs[msgs.length - 1] ?? null;
      const unreadCount = msgs.filter(
        (m) => m.sender_id !== user.id && !m.is_read,
      ).length;

      return {
        id: c.id,
        context_id: c.context_id,
        context_type: c.context_type,
        created_at: c.created_at,
        last_message_at: c.last_message_at,
        product: productsMap.get(c.context_id) ?? null,
        messages: msgs,
        unreadCount,
        lastMessage: lastMsg,
      };
    })
    .filter((c) => c.messages.length > 0);

  return (
    <ProductChatHistoryView
      initialConversations={conversationItems}
      currentUserId={user.id}
      initialSelectedConvId={requestedConvId}
    />
  );
}
