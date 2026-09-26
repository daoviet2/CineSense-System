-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password_hash" VARCHAR NOT NULL,
    "avatar_url" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movies" (
    "id" UUID NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "overview" TEXT NOT NULL,
    "average_rating" DOUBLE PRECISION NOT NULL,
    "poster_url" VARCHAR NOT NULL,
    "release_date" DATE NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_genres" (
    "movie_id" UUID NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "movie_genres_pkey" PRIMARY KEY ("movie_id","genre_id")
);

-- CreateTable
CREATE TABLE "watch_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "movie_id" UUID NOT NULL,
    "watched_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "movie_id" UUID NOT NULL,
    "added_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "movie_id" UUID NOT NULL,
    "score" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "movies_tmdb_id_key" ON "movies"("tmdb_id");

-- CreateIndex
CREATE INDEX "movie_genres_genre_id_idx" ON "movie_genres"("genre_id");

-- CreateIndex
CREATE INDEX "watch_history_user_id_watched_at_idx" ON "watch_history"("user_id", "watched_at" DESC);

-- CreateIndex
CREATE INDEX "watchlists_user_id_idx" ON "watchlists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlists_user_id_movie_id_key" ON "watchlists"("user_id", "movie_id");

-- CreateIndex
CREATE INDEX "ratings_user_id_movie_id_idx" ON "ratings"("user_id", "movie_id");

-- AddForeignKey
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

