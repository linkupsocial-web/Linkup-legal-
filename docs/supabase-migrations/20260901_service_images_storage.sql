-- Service image uploads are performed only by the server-side service-role client.
-- The bucket is public so the stored URL in public.services.image can be rendered
-- by the public catalogue without exposing write permissions to browsers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policy is added. Browser clients do not write service images;
-- the server-side service-role client bypasses RLS, while public reads use the
-- bucket's public delivery URL.
