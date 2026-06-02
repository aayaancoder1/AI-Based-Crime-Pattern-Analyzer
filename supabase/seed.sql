-- Sample normalized crime types for local development.

insert into public.crime_types (name, slug, description)
values
    ('Theft', 'theft', 'Property theft, stealing, shoplifting, and similar non-violent property crimes.'),
    ('Burglary', 'burglary', 'Unauthorized entry into a building or property with intent to commit an offense.'),
    ('Assault', 'assault', 'Physical attack, attempted attack, or threat involving direct personal harm.'),
    ('Robbery', 'robbery', 'Theft involving force, threat, or intimidation.'),
    ('Vandalism', 'vandalism', 'Damage, destruction, or defacement of public or private property.'),
    ('Vehicle Theft', 'vehicle-theft', 'Theft or attempted theft of a motor vehicle.'),
    ('Drug Offense', 'drug-offense', 'Drug possession, sale, distribution, or related controlled-substance offenses.'),
    ('Fraud', 'fraud', 'Deceptive activity for financial or personal gain.'),
    ('Public Disorder', 'public-disorder', 'Disorderly conduct, public disturbance, nuisance, or similar incidents.'),
    ('Other', 'other', 'Fallback category for unmapped or uncommon source crime labels.')
on conflict (slug) do update
set
    name = excluded.name,
    description = excluded.description;
