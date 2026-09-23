-- =====================================================
-- Faure — Fitur Chat: tambahkan policy UPDATE untuk messages
-- -----------------------------------------------------
-- Masalah: tabel messages hanya punya policy SELECT/INSERT.
-- `is_read` tidak pernah bisa diubah (baik oleh user maupun
-- admin), jadi badge "belum dibaca" di chat tidak pernah
-- hilang. Policy di bawah memperbaiki itu.
--
-- Cara pakai: buka Supabase Dashboard → SQL Editor →
-- tempel & jalankan seluruh file ini.
-- =====================================================

-- 1) User bisa mengubah pesan di dalam thread miliknya.
--    Dipakai untuk menandai pesan admin sebagai sudah dibaca.
create policy "messages_update_owner_thread"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

-- 2) Admin bisa mengubah semua pesan.
--    Dipakai untuk menandai pesan pelanggan sebagai sudah dibaca
--    saat admin membuka thread chat.
create policy "messages_update_admin"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);