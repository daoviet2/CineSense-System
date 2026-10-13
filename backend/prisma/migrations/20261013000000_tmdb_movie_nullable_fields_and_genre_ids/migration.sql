-- TMDB genre IDs are assigned by the upstream catalog and must be supplied explicitly.
ALTER TABLE "genres" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "genres_id_seq";

-- TMDB may omit poster artwork and release dates.
ALTER TABLE "movies" ALTER COLUMN "poster_url" DROP NOT NULL;
ALTER TABLE "movies" ALTER COLUMN "release_date" DROP NOT NULL;
