-- Enable required PostgreSQL extensions for CrimeLens.

create extension if not exists postgis;
create extension if not exists pgcrypto;
