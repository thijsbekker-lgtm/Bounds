create or replace function public.normalize_golf_flight_player_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  host_id uuid;
  caller_id uuid;
begin
  select host_user_id into host_id
  from public.golf_flights
  where id = new.flight_id;

  if host_id is null then
    raise exception 'Flight niet gevonden';
  end if;

  caller_id := auth.uid();

  if caller_id is distinct from host_id
     and new.user_id <> host_id
     and new.status = 'accepted' then
    new.status := 'requested';
  end if;

  return new;
end;
$$;
