CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"consent_text" text NOT NULL,
	"source" text DEFAULT 'footer' NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "text_position" text DEFAULT 'left' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "image_mode" text DEFAULT 'cover' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_uq" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
-- Mesma defesa das demais tabelas (0001): RLS ligado sem políticas; só o servidor (dono do banco) acessa.
ALTER TABLE "newsletter_subscribers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Banners que já tinham imagem usavam o texto por cima da foto: mantém a aparência.
UPDATE "banners" SET "text_position" = 'overlay' WHERE "image_url" IS NOT NULL;--> statement-breakpoint
-- "promo" nunca foi exibido; passa a ser o banner secundário.
UPDATE "banners" SET "placement" = 'side' WHERE "placement" = 'promo';--> statement-breakpoint
-- Nova ordem padrão da home (categorias → guia de presentes → vitrines), aplicada SOMENTE se a ordem
-- original nunca foi alterada no painel.
UPDATE "home_sections" SET "position" = CASE "type"::text
    WHEN 'gift_finder' THEN 2 WHEN 'best_sellers' THEN 3 WHEN 'new_arrivals' THEN 4 WHEN 'flash' THEN 5 WHEN 'deals' THEN 6 ELSE "position" END
WHERE (SELECT count(*) FROM "home_sections") = 8
  AND (SELECT count(*) FROM "home_sections" WHERE ("type"::text, "position") IN
       (('hero',0),('categories',1),('best_sellers',2),('flash',3),('deals',4),('gift_finder',5),('new_arrivals',6),('benefits',7))) = 8;
