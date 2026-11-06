-- Temporada visual del sitio (Navidad, Amor y amistad, Día de muertos, Halloween o automática).
ALTER TABLE `StoreSettings` ADD COLUMN `season` VARCHAR(20) NOT NULL DEFAULT 'AUTO';
ALTER TABLE `StoreSettings` ALTER COLUMN `slogan` SET DEFAULT 'Velas artesanales para cada momento';
