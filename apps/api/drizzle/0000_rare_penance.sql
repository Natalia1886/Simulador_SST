CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nit" text NOT NULL,
	"razon_social" text NOT NULL,
	"regimen" text NOT NULL,
	"representante_legal" text NOT NULL,
	"sede" text NOT NULL,
	"ciiu" text NOT NULL,
	"num_trabajadores" integer NOT NULL,
	"riesgo" text NOT NULL,
	"logo_public_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_nit_unique" UNIQUE("nit")
);
--> statement-breakpoint
CREATE TABLE "company_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "evaluation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"standard_code" text NOT NULL,
	"value" text NOT NULL,
	"observation" text NOT NULL,
	"evidence_status" text,
	"evidence_sha256" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_items_evaluation_id_standard_code_unique" UNIQUE("evaluation_id","standard_code")
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"config_json" jsonb NOT NULL,
	"standards_group" text NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"evaluation_id" uuid,
	"type" text NOT NULL,
	"route" text NOT NULL,
	"payload_json" jsonb,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"standard_code" text NOT NULL,
	"sha256" text NOT NULL,
	"status" text NOT NULL,
	"label" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_catalog_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"term" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "improvement_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"standard_code" text NOT NULL,
	"actividad" text NOT NULL,
	"responsable" text NOT NULL,
	"meta" text NOT NULL,
	"plazo_dias" integer NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mintrabajo_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"company_data_json" jsonb NOT NULL,
	"scores_json" jsonb NOT NULL,
	"reconciled" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "responsables_sst" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"licencia" text NOT NULL,
	"resolucion" text NOT NULL,
	"entidad" text NOT NULL,
	"experiencia_meses" integer NOT NULL,
	"curso50_fecha" timestamp with time zone NOT NULL,
	"curso20_fecha" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standard_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"standard_code" text NOT NULL,
	"group" text NOT NULL,
	"weight_override" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "standards" (
	"code" text PRIMARY KEY NOT NULL,
	"phva" text NOT NULL,
	"name" text NOT NULL,
	"criteria" text NOT NULL,
	"verification_mode" text NOT NULL,
	"weight" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"group_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "company_assignments" ADD CONSTRAINT "company_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_assignments" ADD CONSTRAINT "company_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_items" ADD CONSTRAINT "evaluation_items_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_items" ADD CONSTRAINT "evaluation_items_standard_code_standards_code_fk" FOREIGN KEY ("standard_code") REFERENCES "public"."standards"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_catalog" ADD CONSTRAINT "evidence_catalog_standard_code_standards_code_fk" FOREIGN KEY ("standard_code") REFERENCES "public"."standards"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_plan_items" ADD CONSTRAINT "improvement_plan_items_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_plan_items" ADD CONSTRAINT "improvement_plan_items_standard_code_standards_code_fk" FOREIGN KEY ("standard_code") REFERENCES "public"."standards"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mintrabajo_submissions" ADD CONSTRAINT "mintrabajo_submissions_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsables_sst" ADD CONSTRAINT "responsables_sst_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsables_sst" ADD CONSTRAINT "responsables_sst_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standard_groups" ADD CONSTRAINT "standard_groups_standard_code_standards_code_fk" FOREIGN KEY ("standard_code") REFERENCES "public"."standards"("code") ON DELETE no action ON UPDATE no action;