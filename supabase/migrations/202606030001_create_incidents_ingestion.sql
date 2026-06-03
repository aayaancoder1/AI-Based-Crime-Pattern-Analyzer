-- Crime incident ingestion support.
-- This migration aligns the incidents table with the CSV upload flow.

alter table public.incidents
add column if not exists crime_type text;

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'incidents'
          and column_name = 'raw_crime_type'
    ) then
        execute 'update public.incidents set crime_type = coalesce(crime_type, raw_crime_type)';
    end if;
end $$;

create index if not exists idx_incidents_dataset_id
on public.incidents(dataset_id);
