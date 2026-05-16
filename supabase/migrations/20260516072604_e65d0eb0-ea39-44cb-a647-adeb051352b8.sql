
insert into storage.buckets (id, name, public)
values ('qa-images', 'qa-images', true)
on conflict (id) do nothing;

create policy "qa-images public read"
on storage.objects for select
using (bucket_id = 'qa-images');

create policy "qa-images authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'qa-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "qa-images owner delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'qa-images' and (storage.foldername(name))[1] = auth.uid()::text);
