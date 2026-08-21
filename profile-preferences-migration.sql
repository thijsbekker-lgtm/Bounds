-- BOUNDS profile preferences
-- Run only after verifying the production profiles schema.
alter table public.profiles add column if not exists tee_gender_preference text;
alter table public.profiles add column if not exists tee_name_preference text;

alter table public.profiles add constraint profiles_tee_gender_preference_check
  check (tee_gender_preference is null or tee_gender_preference in ('men','women'));

alter table public.profiles add constraint profiles_tee_name_preference_check
  check (tee_name_preference is null or tee_name_preference in ('Wit','Geel','Blauw','Rood','Oranje'));
