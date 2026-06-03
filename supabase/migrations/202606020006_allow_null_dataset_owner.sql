-- V1 has no authentication. Allow dataset owner_id to be null until auth is implemented.

alter table public.datasets
alter column owner_id drop not null;
