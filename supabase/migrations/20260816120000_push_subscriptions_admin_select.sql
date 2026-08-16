-- Permite que administradores vejam as inscrições de push de qualquer membro
-- da família, pro painel admin mostrar quem ativou notificações neste
-- aparelho. Sem isso a RLS (push_subscriptions_select_own, ver migration
-- 20260814190000) restringia o SELECT à própria inscrição — o admin só
-- enxergava a de si mesmo.
create policy "push_subscriptions_select_admin" on public.push_subscriptions
  for select using (public.is_admin());
