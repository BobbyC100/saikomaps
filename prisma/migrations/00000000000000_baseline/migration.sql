--
-- PostgreSQL database dump
--


-- Dumped from database version 17.8 (a284a84)
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public;


--
-- Name: ActorKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActorKind" AS ENUM (
    'organization',
    'brand',
    'person',
    'operator',
    'collective'
);


--
-- Name: ActorRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActorRole" AS ENUM (
    'operator',
    'owner',
    'parent',
    'founder',
    'brand',
    'collective',
    'chef',
    'sommelier',
    'pastry_chef',
    'beverage_director',
    'wine_director'
);


--
-- Name: ArchiveReason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArchiveReason" AS ENUM (
    'CLOSED',
    'AGED_OUT',
    'QUALITY_DECLINE',
    'DATA_ERROR',
    'MANUAL'
);


--
-- Name: AttributeClass; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttributeClass" AS ENUM (
    'CANONICAL',
    'DERIVED',
    'INTERPRETATION'
);


--
-- Name: ClaimResolutionMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ClaimResolutionMethod" AS ENUM (
    'SLUG_EXACT',
    'GOOGLE_PLACE_ID_EXACT',
    'PLACEKEY_EXACT',
    'FUZZY_MATCH',
    'HUMAN_REVIEW',
    'NEW_ENTITY'
);


--
-- Name: ConfidenceBucket; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConfidenceBucket" AS ENUM (
    'HIGH',
    'MEDIUM',
    'LOW'
);


--
-- Name: DecayPolicy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DecayPolicy" AS ENUM (
    'NONE',
    'TIME_BASED',
    'SOURCE_UPDATED'
);


--
-- Name: EnrichmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EnrichmentStatus" AS ENUM (
    'INGESTED',
    'ENRICHING',
    'ENRICHED'
);


--
-- Name: ExtractionMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExtractionMethod" AS ENUM (
    'API',
    'SCRAPE',
    'AI_EXTRACT',
    'HUMAN',
    'IMPORT'
);


--
-- Name: GpidHumanDecision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GpidHumanDecision" AS ENUM (
    'APPLY_GPID',
    'MARK_NO_MATCH',
    'MARK_AMBIGUOUS'
);


--
-- Name: GpidHumanStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GpidHumanStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'NEEDS_MORE_INFO'
);


--
-- Name: GpidResolverStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GpidResolverStatus" AS ENUM (
    'MATCH',
    'AMBIGUOUS',
    'NO_MATCH',
    'ERROR'
);


--
-- Name: InterpretationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InterpretationType" AS ENUM (
    'TAGLINE',
    'PULL_QUOTE',
    'SCENESENSE_PRL',
    'VOICE_DESCRIPTOR'
);


--
-- Name: LayerType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LayerType" AS ENUM (
    'SKATE',
    'SURF'
);


--
-- Name: LifecycleStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LifecycleStatus" AS ENUM (
    'ACTIVE',
    'LEGACY_FAVORITE',
    'FLAG_FOR_REVIEW',
    'ARCHIVED',
    'CLOSED_PERMANENTLY'
);


--
-- Name: MapStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MapStatus" AS ENUM (
    'DRAFT',
    'READY',
    'PUBLISHED',
    'ARCHIVED'
);


--
-- Name: MatchMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MatchMethod" AS ENUM (
    'exact',
    'normalized',
    'fuzzy'
);


--
-- Name: OperatingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OperatingStatus" AS ENUM (
    'SOFT_OPEN',
    'OPERATING',
    'TEMPORARILY_CLOSED',
    'PERMANENTLY_CLOSED'
);


--
-- Name: OperatorPlaceCandidateStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OperatorPlaceCandidateStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'STALE'
);


--
-- Name: OrganizingLogic; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrganizingLogic" AS ENUM (
    'TIME_BASED',
    'NEIGHBORHOOD_BASED',
    'ROUTE_BASED',
    'PURPOSE_BASED',
    'LAYERED'
);


--
-- Name: OverlayApprovalMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OverlayApprovalMethod" AS ENUM (
    'manual'
);


--
-- Name: OverlayType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OverlayType" AS ENUM (
    'closure',
    'hours_override',
    'event',
    'uncertainty'
);


--
-- Name: PersonPlaceRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PersonPlaceRole" AS ENUM (
    'EXECUTIVE_CHEF',
    'OWNER',
    'FOUNDER',
    'FORMER_CHEF',
    'PARTNER',
    'OPERATOR'
);


--
-- Name: PersonRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PersonRole" AS ENUM (
    'CHEF',
    'OWNER',
    'OPERATOR',
    'FOUNDER',
    'PARTNER'
);


--
-- Name: PlaceAppearanceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlaceAppearanceStatus" AS ENUM (
    'ACTIVE',
    'ENDED',
    'ANNOUNCED'
);


--
-- Name: PlacePhotoEvalTier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlacePhotoEvalTier" AS ENUM (
    'HERO',
    'GALLERY',
    'REJECT'
);


--
-- Name: PlacePhotoEvalType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlacePhotoEvalType" AS ENUM (
    'EXTERIOR',
    'INTERIOR',
    'CONTEXT',
    'FOOD'
);


--
-- Name: PlaceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlaceStatus" AS ENUM (
    'OPEN',
    'CLOSED',
    'PERMANENTLY_CLOSED',
    'CANDIDATE'
);


--
-- Name: PlaceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlaceType" AS ENUM (
    'venue',
    'activity',
    'public'
);


--
-- Name: PrimaryVertical; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PrimaryVertical" AS ENUM (
    'EAT',
    'COFFEE',
    'WINE',
    'DRINKS',
    'SHOP',
    'CULTURE',
    'NATURE',
    'STAY',
    'WELLNESS',
    'BAKERY',
    'PURVEYORS',
    'ACTIVITY',
    'PARKS'
);


--
-- Name: PromotionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PromotionStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'PUBLISHED'
);


--
-- Name: ProposedSignalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProposedSignalStatus" AS ENUM (
    'proposed',
    'approved',
    'rejected',
    'superseded'
);


--
-- Name: ProposedSignalType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProposedSignalType" AS ENUM (
    'closure',
    'hours_override',
    'event',
    'recurring_program',
    'uncertainty'
);


--
-- Name: PublicationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PublicationStatus" AS ENUM (
    'PUBLISHED',
    'UNPUBLISHED'
);


--
-- Name: ResolutionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResolutionType" AS ENUM (
    'matched',
    'created',
    'ambiguous'
);


--
-- Name: SanctionConflictStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SanctionConflictStatus" AS ENUM (
    'OPEN',
    'RESOLVED_HUMAN',
    'RESOLVED_AUTO'
);


--
-- Name: SanctionMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SanctionMethod" AS ENUM (
    'AUTO_HIGH_CONFIDENCE',
    'AUTO_SOLE_SOURCE',
    'HUMAN_APPROVED',
    'HUMAN_OVERRIDE'
);


--
-- Name: SignalSourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SignalSourceType" AS ENUM (
    'newsletter_email'
);


--
-- Name: SourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SourceType" AS ENUM (
    'GOOGLE_PLACES',
    'EDITORIAL',
    'OPERATOR_WEBSITE',
    'SOCIAL',
    'NEWSLETTER',
    'HUMAN_REVIEW',
    'SYSTEM_IMPORT'
);


--
-- Name: SpatialRelationshipType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SpatialRelationshipType" AS ENUM (
    'CONTAINS',
    'ZONE_OF',
    'PART_OF',
    'ADJACENT_TO'
);


--
-- Name: SpotSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SpotSource" AS ENUM (
    'OSM',
    'CITY_DATA',
    'EDITORIAL',
    'COMMUNITY'
);


--
-- Name: VerificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VerificationStatus" AS ENUM (
    'UNVERIFIED',
    'SOURCE_CONFIRMED',
    'FOUNDER_VERIFIED'
);


--
-- Name: Visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Visibility" AS ENUM (
    'INTERNAL',
    'VERIFIED'
);


--
-- Name: signal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.signal_status AS ENUM (
    'ok',
    'partial',
    'failed'
);


--
-- Name: merchant_surfaces_prevent_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merchant_surfaces_prevent_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Block any attempt to modify the immutable evidence columns.
  -- parse_status and extraction_status are lifecycle fields and may be updated
  -- by downstream pipeline stages (parse pass, extraction pass).
  IF (
    NEW.entity_id        IS DISTINCT FROM OLD.entity_id        OR
    NEW.surface_type     IS DISTINCT FROM OLD.surface_type     OR
    NEW.source_url       IS DISTINCT FROM OLD.source_url       OR
    NEW.content_type     IS DISTINCT FROM OLD.content_type     OR
    NEW.fetch_status     IS DISTINCT FROM OLD.fetch_status     OR
    NEW.content_hash     IS DISTINCT FROM OLD.content_hash     OR
    NEW.raw_text         IS DISTINCT FROM OLD.raw_text         OR
    NEW.raw_html         IS DISTINCT FROM OLD.raw_html         OR
    NEW.fetched_at       IS DISTINCT FROM OLD.fetched_at       OR
    NEW.discovered_at    IS DISTINCT FROM OLD.discovered_at    OR
    NEW.metadata_json    IS DISTINCT FROM OLD.metadata_json
  ) THEN
    RAISE EXCEPTION
      'merchant_surfaces evidence fields are immutable (id=%). '
      'Only parse_status and extraction_status may be updated. '
      'New fetches must create new rows.',
      OLD.id;
  END IF;

  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Actor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Actor" (
    id text NOT NULL,
    name text NOT NULL,
    kind public."ActorKind" DEFAULT 'operator'::public."ActorKind" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    slug text,
    website text,
    description text,
    visibility public."Visibility",
    sources jsonb,
    confidence double precision
);


--
-- Name: EntityActorRelationship; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EntityActorRelationship" (
    id text NOT NULL,
    entity_id text NOT NULL,
    actor_id text NOT NULL,
    role public."ActorRole" NOT NULL,
    confidence double precision,
    source text,
    start_date timestamp(3) without time zone,
    end_date timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: FieldsMembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FieldsMembership" (
    id text NOT NULL,
    entity_id text NOT NULL,
    included_at timestamp(3) without time zone NOT NULL,
    removed_at timestamp(3) without time zone,
    curator_id text,
    reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: TraceSignalsCache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TraceSignalsCache" (
    id text NOT NULL,
    entity_id text NOT NULL,
    computed_at timestamp(3) without time zone NOT NULL,
    signals jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: activity_spots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_spots (
    id text NOT NULL,
    name text NOT NULL,
    slug text,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    layer_type public."LayerType" NOT NULL,
    city text,
    region text,
    country text DEFAULT 'US'::text NOT NULL,
    spot_type text,
    tags text[],
    surface text,
    skill_level text,
    exposure text,
    description text,
    seasonality text,
    is_public boolean DEFAULT true NOT NULL,
    source public."SpotSource" NOT NULL,
    source_id text,
    source_url text,
    verified boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: attribute_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attribute_registry (
    attribute_key text NOT NULL,
    display_name text NOT NULL,
    attribute_class public."AttributeClass" NOT NULL,
    identity_critical boolean DEFAULT false NOT NULL,
    sanction_threshold numeric(3,2) DEFAULT 0.70 NOT NULL,
    decay_policy public."DecayPolicy" DEFAULT 'NONE'::public."DecayPolicy" NOT NULL
);


--
-- Name: canonical_entity_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_entity_state (
    entity_id text NOT NULL,
    name text NOT NULL,
    google_place_id text,
    latitude numeric(10,7),
    longitude numeric(11,7),
    address text,
    neighborhood text,
    phone text,
    website text,
    instagram text,
    hours_json jsonb,
    price_level integer,
    reservation_url text,
    menu_url text,
    winelist_url text,
    description text,
    cuisine_type text,
    category text,
    tips text[] DEFAULT '{}'::text[] NOT NULL,
    google_photos jsonb,
    google_places_attributes jsonb,
    last_sanctioned_at timestamp(3) without time zone,
    sanctioned_by text,
    tiktok text,
    events_url text,
    catering_url text,
    event_inquiry_email text,
    event_inquiry_form_url text
);


--
-- Name: canonical_sanctions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_sanctions (
    sanction_id text NOT NULL,
    entity_id text NOT NULL,
    attribute_key text NOT NULL,
    claim_id text NOT NULL,
    sanctioned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sanctioned_by text NOT NULL,
    sanction_method public."SanctionMethod" NOT NULL,
    is_current boolean DEFAULT true NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id text NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: civic_parks_raw_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.civic_parks_raw_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coverage_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coverage_runs (
    id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_host text NOT NULL,
    db_name text NOT NULL,
    git_sha text,
    limit_val integer,
    la_only boolean DEFAULT true NOT NULL,
    ttl_days integer
);


--
-- Name: coverage_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coverage_sources (
    id text NOT NULL,
    entity_id text NOT NULL,
    source_name text NOT NULL,
    url text NOT NULL,
    excerpt text,
    published_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: derived_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.derived_signals (
    signal_id text NOT NULL,
    entity_id text NOT NULL,
    signal_key text NOT NULL,
    signal_value jsonb NOT NULL,
    signal_version text NOT NULL,
    input_claim_ids text[] NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: energy_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.energy_scores (
    id text NOT NULL,
    entity_id text NOT NULL,
    energy_score integer NOT NULL,
    energy_confidence double precision NOT NULL,
    popularity_component integer,
    language_component integer,
    flags_component integer,
    sensory_component integer,
    has_popularity boolean DEFAULT false NOT NULL,
    has_language boolean DEFAULT false NOT NULL,
    has_flags boolean DEFAULT false NOT NULL,
    has_sensory boolean DEFAULT false NOT NULL,
    version text NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: energy_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.energy_versions (
    version text NOT NULL,
    weights jsonb,
    lexicon_hash text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entities (
    id text NOT NULL,
    slug text NOT NULL,
    google_place_id text,
    name text NOT NULL,
    address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    phone text,
    website text,
    instagram text,
    hours jsonb,
    description text,
    google_photos jsonb,
    google_types text[] DEFAULT ARRAY[]::text[],
    price_level integer,
    neighborhood text,
    category text,
    places_data_cached_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    editorial_sources jsonb,
    cuisine_type text,
    ad_unit_override boolean DEFAULT false NOT NULL,
    ad_unit_type text,
    pull_quote text,
    pull_quote_author text,
    pull_quote_source text,
    pull_quote_type text,
    pull_quote_url text,
    tagline text,
    tagline_candidates text[] DEFAULT ARRAY[]::text[],
    tagline_generated timestamp(3) without time zone,
    tagline_pattern text,
    tagline_signals jsonb,
    tips text[] DEFAULT ARRAY[]::text[],
    chef_recs jsonb,
    restaurant_group_id text,
    status public."PlaceStatus" DEFAULT 'OPEN'::public."PlaceStatus" NOT NULL,
    intent_profile text,
    intent_profile_override boolean DEFAULT false NOT NULL,
    reservation_url text,
    entity_type public."PlaceType" DEFAULT 'venue'::public."PlaceType" NOT NULL,
    category_id text,
    parent_id text,
    market_schedule jsonb,
    primary_vertical public."PrimaryVertical" NOT NULL,
    transit_accessible boolean,
    thematic_tags text[] DEFAULT ARRAY[]::text[],
    contextual_connection text,
    curator_attribution text,
    prl_override integer,
    business_status text,
    confidence jsonb DEFAULT '{}'::jsonb,
    overall_confidence double precision DEFAULT 0.5,
    confidence_updated_at timestamp(3) without time zone,
    last_enriched_at timestamp with time zone,
    enrichment_stage text,
    needs_human_review boolean DEFAULT false,
    category_enrich_attempted_at timestamp with time zone,
    description_source text,
    description_confidence double precision,
    description_reviewed boolean DEFAULT false NOT NULL,
    google_places_attributes jsonb,
    google_places_attributes_fetched_at timestamp(3) without time zone,
    tiktok text,
    operating_status public."OperatingStatus",
    enrichment_status public."EnrichmentStatus",
    publication_status public."PublicationStatus"
);


--
-- Name: place_coverage_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.place_coverage_status (
    id text NOT NULL,
    entity_id text NOT NULL,
    dedupe_key text NOT NULL,
    last_success_at timestamp(3) without time zone,
    last_attempt_at timestamp(3) without time zone,
    last_attempt_status text,
    last_error_code text,
    last_error_message text,
    last_missing_groups jsonb,
    source text,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: entity_enrichment_tiers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.entity_enrichment_tiers AS
 SELECT e.id,
    e.neighborhood,
    e.category AS vertical,
    ((lower(TRIM(BOTH FROM COALESCE(e.neighborhood, 'unknown'::text))) || '.'::text) || lower(TRIM(BOTH FROM COALESCE(e.category, 'unknown'::text)))) AS coverage_unit,
    ((((((((
        CASE
            WHEN (ces.name IS NOT NULL) THEN 1
            ELSE 0
        END +
        CASE
            WHEN (ces.address IS NOT NULL) THEN 1
            ELSE 0
        END) +
        CASE
            WHEN (ces.neighborhood IS NOT NULL) THEN 1
            ELSE 0
        END) +
        CASE
            WHEN (ces.category IS NOT NULL) THEN 1
            ELSE 0
        END) +
        CASE
            WHEN (ces.google_place_id IS NOT NULL) THEN 1
            ELSE 0
        END) +
        CASE
            WHEN (ces.latitude IS NOT NULL) THEN 1
            ELSE 0
        END) +
        CASE
            WHEN (ces.longitude IS NOT NULL) THEN 1
            ELSE 0
        END))::numeric / (7)::numeric) AS field_completion,
        CASE
            WHEN (pcs.last_success_at < (now() - '90 days'::interval)) THEN 0.10
            ELSE (0)::numeric
        END AS stale_penalty,
        CASE
            WHEN (jsonb_array_length(COALESCE(pcs.last_missing_groups, '[]'::jsonb)) > 2) THEN 0.15
            ELSE (0)::numeric
        END AS missing_group_penalty,
        CASE
            WHEN (((((((((((
            CASE
                WHEN (ces.name IS NOT NULL) THEN 1
                ELSE 0
            END +
            CASE
                WHEN (ces.address IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.neighborhood IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.category IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.google_place_id IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.latitude IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.longitude IS NOT NULL) THEN 1
                ELSE 0
            END))::numeric / (7)::numeric) -
            CASE
                WHEN (pcs.last_success_at < (now() - '90 days'::interval)) THEN 0.10
                ELSE (0)::numeric
            END) -
            CASE
                WHEN (jsonb_array_length(COALESCE(pcs.last_missing_groups, '[]'::jsonb)) > 2) THEN 0.15
                ELSE (0)::numeric
            END) >= 0.85) THEN 'complete'::text
            WHEN (((((((((((
            CASE
                WHEN (ces.name IS NOT NULL) THEN 1
                ELSE 0
            END +
            CASE
                WHEN (ces.address IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.neighborhood IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.category IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.google_place_id IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.latitude IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.longitude IS NOT NULL) THEN 1
                ELSE 0
            END))::numeric / (7)::numeric) -
            CASE
                WHEN (pcs.last_success_at < (now() - '90 days'::interval)) THEN 0.10
                ELSE (0)::numeric
            END) -
            CASE
                WHEN (jsonb_array_length(COALESCE(pcs.last_missing_groups, '[]'::jsonb)) > 2) THEN 0.15
                ELSE (0)::numeric
            END) >= 0.60) THEN 'substantial'::text
            WHEN (((((((((((
            CASE
                WHEN (ces.name IS NOT NULL) THEN 1
                ELSE 0
            END +
            CASE
                WHEN (ces.address IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.neighborhood IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.category IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.google_place_id IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.latitude IS NOT NULL) THEN 1
                ELSE 0
            END) +
            CASE
                WHEN (ces.longitude IS NOT NULL) THEN 1
                ELSE 0
            END))::numeric / (7)::numeric) -
            CASE
                WHEN (pcs.last_success_at < (now() - '90 days'::interval)) THEN 0.10
                ELSE (0)::numeric
            END) -
            CASE
                WHEN (jsonb_array_length(COALESCE(pcs.last_missing_groups, '[]'::jsonb)) > 2) THEN 0.15
                ELSE (0)::numeric
            END) >= 0.35) THEN 'partial'::text
            ELSE 'sparse'::text
        END AS enrichment_tier
   FROM ((public.entities e
     LEFT JOIN public.canonical_entity_state ces ON ((ces.entity_id = e.id)))
     LEFT JOIN public.place_coverage_status pcs ON ((pcs.entity_id = e.id)));


--
-- Name: entity_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id text NOT NULL,
    problem_class text NOT NULL,
    issue_type text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    blocking_publish boolean DEFAULT false NOT NULL,
    recommended_tool text,
    detail jsonb,
    resolved_at timestamp with time zone,
    resolved_by text,
    suppressed_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entity_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_links (
    canonical_id text NOT NULL,
    raw_id text NOT NULL,
    match_confidence numeric(4,3),
    match_method text NOT NULL,
    match_features jsonb,
    is_active boolean DEFAULT true NOT NULL,
    linked_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    linked_by text
);


--
-- Name: golden_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.golden_records (
    canonical_id text NOT NULL,
    placekey text,
    google_place_id text,
    slug text NOT NULL,
    name text NOT NULL,
    name_display text,
    lat numeric(10,7),
    lng numeric(11,7),
    address_street text,
    address_city text,
    address_state text,
    address_zip text,
    neighborhood text,
    category text,
    cuisines text[],
    price_level integer,
    phone text,
    website text,
    instagram_handle text,
    hours_json jsonb,
    hours_irregular boolean DEFAULT false NOT NULL,
    description text,
    vibe_tags text[],
    signature_dishes text[],
    pro_tips text[],
    pull_quote text,
    pull_quote_source text,
    pull_quote_url text,
    business_status text DEFAULT 'operational'::text NOT NULL,
    lifecycle_status public."LifecycleStatus" DEFAULT 'ACTIVE'::public."LifecycleStatus" NOT NULL,
    archive_reason public."ArchiveReason",
    archived_at timestamp(3) without time zone,
    archived_by text,
    source_attribution jsonb NOT NULL,
    provenance_v2 jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    last_resolved_at timestamp(3) without time zone,
    enriched_at timestamp(3) without time zone,
    county text,
    data_completeness numeric(3,2),
    source_count integer DEFAULT 1 NOT NULL,
    menu_url text,
    menu_source_url text,
    menu_raw_text text,
    winelist_url text,
    winelist_source_url text,
    winelist_raw_text text,
    about_copy text,
    about_source_url text,
    scraped_at timestamp(3) without time zone,
    scrape_status text,
    cuisine_posture text,
    service_model text,
    price_tier text,
    wine_program_intent text,
    place_personality text,
    identity_signals jsonb,
    signals_generated_at timestamp(3) without time zone,
    signals_version integer,
    signals_reviewed boolean DEFAULT false NOT NULL,
    signals_reviewed_by text,
    signals_reviewed_at timestamp(3) without time zone,
    tagline text,
    tagline_candidates text[],
    tagline_pattern text,
    tagline_generated_at timestamp(3) without time zone,
    tagline_signals jsonb,
    tagline_version integer,
    google_places_attributes jsonb,
    google_places_attributes_fetched_at timestamp(3) without time zone,
    energy_score integer,
    energy_confidence double precision,
    energy_version text,
    energy_computed_at timestamp(3) without time zone,
    formality_score integer,
    formality_confidence double precision,
    formality_version text,
    formality_computed_at timestamp(3) without time zone,
    confidence double precision,
    promotion_status public."PromotionStatus" DEFAULT 'PENDING'::public."PromotionStatus" NOT NULL,
    website_source text,
    website_confidence numeric(3,2),
    website_updated_at timestamp(3) without time zone,
    website_source_class text,
    match_confidence double precision,
    merge_quality double precision,
    field_confidences jsonb,
    winner_sources jsonb,
    field_conflicts jsonb,
    instagram_hours_raw text,
    website_about_url text,
    website_about_raw text,
    website_about_extracted_at timestamp(3) without time zone,
    tiktok text
);


--
-- Name: gpid_resolution_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gpid_resolution_queue (
    id text NOT NULL,
    entity_id text NOT NULL,
    candidate_gpid text,
    resolver_status public."GpidResolverStatus" NOT NULL,
    reason_code text,
    similarity_score double precision,
    candidates_json jsonb,
    source_run_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    human_status public."GpidHumanStatus" DEFAULT 'PENDING'::public."GpidHumanStatus" NOT NULL,
    human_decision public."GpidHumanDecision",
    human_note text,
    reviewed_by text,
    reviewed_at timestamp(3) without time zone
);


--
-- Name: identity_enrichment_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_enrichment_runs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    raw_id text NOT NULL,
    review_queue_id text,
    source_name text NOT NULL,
    searched_name text,
    searched_city text,
    result_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    identity_confidence numeric(4,3),
    anchor_count integer DEFAULT 0 NOT NULL,
    decision_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_jobs (
    id text NOT NULL,
    user_id text NOT NULL,
    list_id text,
    status text DEFAULT 'processing'::text NOT NULL,
    total_locations integer,
    processed_locations integer DEFAULT 0 NOT NULL,
    failed_locations integer DEFAULT 0 NOT NULL,
    error_log jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(3) without time zone
);


--
-- Name: instagram_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instagram_accounts (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    entity_id text NOT NULL,
    instagram_user_id text NOT NULL,
    username text NOT NULL,
    account_type text,
    media_count integer,
    canonical_instagram_url text,
    last_fetched_at timestamp with time zone,
    last_successful_fetch_at timestamp with time zone,
    source_status text DEFAULT 'active'::text NOT NULL,
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: instagram_insight_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instagram_insight_snapshots (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    subject_type text NOT NULL,
    subject_id text NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric(12,2) NOT NULL,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    window_label text,
    raw_payload jsonb
);


--
-- Name: instagram_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instagram_media (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    instagram_media_id text NOT NULL,
    instagram_user_id text NOT NULL,
    media_type text NOT NULL,
    media_url text,
    thumbnail_url text,
    permalink text NOT NULL,
    caption text,
    "timestamp" timestamp with time zone NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_payload jsonb
);


--
-- Name: interpretation_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interpretation_cache (
    cache_id text DEFAULT (gen_random_uuid())::text NOT NULL,
    entity_id text NOT NULL,
    output_type public."InterpretationType" NOT NULL,
    content jsonb NOT NULL,
    prompt_version text NOT NULL,
    model_version text,
    generated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone,
    input_signal_ids text[] DEFAULT '{}'::text[] NOT NULL,
    is_current boolean DEFAULT true NOT NULL
);


--
-- Name: lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lists (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    subtitle text,
    description text,
    description_source text,
    slug text NOT NULL,
    intro_text text,
    function_type text,
    function_context text,
    scope_geography text,
    scope_place_types text[],
    scope_exclusions text[],
    organizing_logic public."OrganizingLogic",
    organizing_logic_note text,
    notes text,
    status public."MapStatus" DEFAULT 'DRAFT'::public."MapStatus" NOT NULL,
    published_at timestamp(3) without time zone,
    template_type text DEFAULT 'field-notes'::text NOT NULL,
    cover_image_url text,
    primary_color text DEFAULT '#5BA7A7'::text NOT NULL,
    secondary_color text DEFAULT '#7FA5A5'::text NOT NULL,
    access_level text DEFAULT 'public'::text NOT NULL,
    password_hash text,
    allowed_emails text[],
    published boolean DEFAULT false NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id text NOT NULL,
    list_id text NOT NULL,
    google_place_id text,
    name text NOT NULL,
    address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    phone text,
    website text,
    instagram text,
    hours jsonb,
    description text,
    google_types text[] DEFAULT ARRAY[]::text[],
    price_level integer,
    neighborhood text,
    google_photos jsonb,
    user_photos text[],
    user_note text,
    category text,
    descriptor text,
    order_index integer DEFAULT 0 NOT NULL,
    places_data_cached_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: map_places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.map_places (
    id text NOT NULL,
    map_id text NOT NULL,
    entity_id text NOT NULL,
    descriptor character varying(120),
    user_note text,
    user_photos text[],
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: menu_fetches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_fetches (
    id text NOT NULL,
    entity_id text NOT NULL,
    source_url text NOT NULL,
    final_url text,
    menu_format text DEFAULT 'html'::text NOT NULL,
    http_status integer,
    fetch_duration_ms integer,
    fetched_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    raw_text text,
    content_hash text,
    raw_html_pointer text,
    text_extraction_method text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    content_type text,
    pdf_type text,
    extraction_quality text
);


--
-- Name: menu_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_signals (
    id text NOT NULL,
    golden_record_id text NOT NULL,
    schema_version integer DEFAULT 1 NOT NULL,
    model_version text,
    source_scraped_at timestamp(3) without time zone,
    analyzed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public.signal_status DEFAULT 'ok'::public.signal_status NOT NULL,
    error text,
    payload jsonb,
    evidence jsonb,
    confidence double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: merchant_enrichment_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_enrichment_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id text NOT NULL,
    source_url text NOT NULL,
    final_url text,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    http_status integer,
    extraction_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    confidence numeric,
    cost_usd numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_signals (
    entity_id text NOT NULL,
    inferred_category text,
    inferred_cuisine jsonb,
    reservation_provider text,
    reservation_url text,
    ordering_provider text,
    ordering_url text,
    menu_url text,
    social_links jsonb,
    extraction_confidence numeric,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    winelist_url text
);


--
-- Name: merchant_surface_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_surface_artifacts (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    merchant_surface_id text NOT NULL,
    artifact_type text NOT NULL,
    artifact_version text NOT NULL,
    artifact_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_surface_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_surface_scans (
    id text NOT NULL,
    entity_id text NOT NULL,
    fetched_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source_url text NOT NULL,
    final_url text,
    http_status integer,
    website_platform text,
    menu_present boolean DEFAULT false NOT NULL,
    menu_format text,
    menu_url text,
    menu_read_state text,
    reservation_platform text,
    reservation_url text,
    ordering_platform text,
    ordering_url text,
    instagram_present boolean DEFAULT false NOT NULL,
    instagram_url text,
    newsletter_present boolean DEFAULT false NOT NULL,
    newsletter_platform text,
    gift_cards_present boolean DEFAULT false NOT NULL,
    careers_present boolean DEFAULT false NOT NULL,
    private_dining_present boolean DEFAULT false NOT NULL,
    sibling_entities_present boolean DEFAULT false NOT NULL,
    sibling_entity_urls jsonb,
    sibling_entity_labels jsonb
);


--
-- Name: merchant_surfaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_surfaces (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    entity_id text NOT NULL,
    surface_type text NOT NULL,
    source_url text NOT NULL,
    content_type text,
    fetch_status text NOT NULL,
    parse_status text,
    extraction_status text DEFAULT 'not_attempted'::text NOT NULL,
    content_hash text,
    raw_text text,
    raw_html text,
    fetched_at timestamp with time zone,
    discovered_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata_json jsonb
);


--
-- Name: observed_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observed_claims (
    claim_id text DEFAULT (gen_random_uuid())::text NOT NULL,
    entity_id text NOT NULL,
    attribute_key text NOT NULL,
    raw_value jsonb NOT NULL,
    normalized_value text,
    source_id text NOT NULL,
    source_url text,
    observed_at timestamp(3) without time zone NOT NULL,
    extracted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    extraction_method public."ExtractionMethod" NOT NULL,
    confidence numeric(4,3),
    resolution_method public."ClaimResolutionMethod" NOT NULL,
    resolution_confidence numeric(4,3),
    supersedes_claim_id text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: operational_overlays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operational_overlays (
    id text NOT NULL,
    place_id text NOT NULL,
    source_signal_id text NOT NULL,
    overlay_type public."OverlayType" NOT NULL,
    starts_at timestamp(3) without time zone NOT NULL,
    ends_at timestamp(3) without time zone NOT NULL,
    override_data jsonb,
    approval_method public."OverlayApprovalMethod" DEFAULT 'manual'::public."OverlayApprovalMethod" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: operator_place_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operator_place_candidates (
    id text NOT NULL,
    actor_id text NOT NULL,
    entity_id text,
    candidate_name text NOT NULL,
    candidate_url text,
    candidate_address text,
    source_url text NOT NULL,
    match_score double precision DEFAULT 0 NOT NULL,
    match_reason text,
    status public."OperatorPlaceCandidateStatus" DEFAULT 'PENDING'::public."OperatorPlaceCandidateStatus" NOT NULL,
    rejection_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    reviewed_at timestamp(3) without time zone,
    approved_by text,
    confidence_bucket public."ConfidenceBucket"
);


--
-- Name: park_facility_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_facility_relationships (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    parent_entity_id text NOT NULL,
    child_entity_id text NOT NULL,
    relationship_type public."SpatialRelationshipType" DEFAULT 'CONTAINS'::public."SpatialRelationshipType" NOT NULL,
    confidence double precision,
    source text DEFAULT 'auto_match'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.people (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    role public."PersonRole" NOT NULL,
    visibility public."Visibility" NOT NULL,
    bio text,
    image_url text,
    sources jsonb NOT NULL,
    restaurant_group_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: person_places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_places (
    id text NOT NULL,
    person_id text NOT NULL,
    entity_id text NOT NULL,
    role public."PersonPlaceRole" NOT NULL,
    current boolean DEFAULT true NOT NULL,
    start_year integer,
    end_year integer,
    source text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: place_actor_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.place_actor_relationships (
    id text NOT NULL,
    entity_id text NOT NULL,
    actor_id text NOT NULL,
    role public."ActorRole" NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    start_date timestamp(3) without time zone,
    end_date timestamp(3) without time zone,
    sources jsonb,
    confidence double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: place_appearances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.place_appearances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_entity_id text NOT NULL,
    host_entity_id text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    address_text text,
    schedule_text text NOT NULL,
    status public."PlaceAppearanceStatus" DEFAULT 'ACTIVE'::public."PlaceAppearanceStatus" NOT NULL,
    sources jsonb,
    confidence double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT place_appearances_location_check CHECK (((host_entity_id IS NOT NULL) OR ((latitude IS NOT NULL) AND (longitude IS NOT NULL) AND (address_text IS NOT NULL))))
);


--
-- Name: place_job_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.place_job_log (
    id text NOT NULL,
    entity_id text NOT NULL,
    entity_type text NOT NULL,
    job_type text NOT NULL,
    pages_fetched integer DEFAULT 0 NOT NULL,
    ai_calls integer DEFAULT 0 NOT NULL,
    duration_ms integer,
    estimated_cost numeric(10,6),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: place_photo_eval; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.place_photo_eval (
    id text NOT NULL,
    entity_id text NOT NULL,
    google_place_id text NOT NULL,
    photo_ref text NOT NULL,
    width_px integer NOT NULL,
    height_px integer NOT NULL,
    requested_max_width_px integer DEFAULT 1600 NOT NULL,
    tier public."PlacePhotoEvalTier" NOT NULL,
    type public."PlacePhotoEvalType",
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: place_tag_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.place_tag_scores (
    id text NOT NULL,
    entity_id text NOT NULL,
    cozy_score double precision NOT NULL,
    date_night_score double precision NOT NULL,
    late_night_score double precision NOT NULL,
    after_work_score double precision NOT NULL,
    scene_score double precision NOT NULL,
    confidence double precision,
    version text NOT NULL,
    depends_on_energy_version text NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: proposed_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposed_signals (
    id text NOT NULL,
    place_id text NOT NULL,
    source_type public."SignalSourceType" NOT NULL,
    source_id text NOT NULL,
    signal_type public."ProposedSignalType" NOT NULL,
    extracted_data jsonb NOT NULL,
    confidence_score double precision,
    evidence_excerpt text,
    status public."ProposedSignalStatus" DEFAULT 'proposed'::public."ProposedSignalStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: provenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provenance (
    id text NOT NULL,
    place_id text NOT NULL,
    added_by text NOT NULL,
    source_type text,
    source_name text,
    source_url text,
    source_date timestamp(3) without time zone,
    notes text,
    import_batch text,
    source_tier integer,
    verification_status public."VerificationStatus" DEFAULT 'UNVERIFIED'::public."VerificationStatus" NOT NULL,
    source_verified_at timestamp(3) without time zone,
    source_verified_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: raw_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_records (
    raw_id text NOT NULL,
    source_name text NOT NULL,
    external_id text,
    source_url text,
    placekey text,
    h3_index_r9 bigint,
    h3_neighbors_r9 bigint[],
    raw_json jsonb NOT NULL,
    name_normalized text,
    lat numeric(10,7),
    lng numeric(11,7),
    observed_at timestamp(3) without time zone,
    ingested_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_processed boolean DEFAULT false NOT NULL,
    intake_batch_id text,
    source_type text,
    imported_at timestamp(3) without time zone
);


--
-- Name: reservation_provider_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservation_provider_matches (
    id text DEFAULT gen_random_uuid() NOT NULL,
    entity_id text NOT NULL,
    provider text NOT NULL,
    provider_venue_id text,
    booking_url text,
    match_status text DEFAULT 'unverified'::text NOT NULL,
    match_score double precision,
    match_signals jsonb,
    validation_source text DEFAULT 'website_link'::text NOT NULL,
    confidence_level text DEFAULT 'weak'::text NOT NULL,
    is_renderable boolean DEFAULT false NOT NULL,
    program_signals jsonb,
    last_checked_at timestamp with time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reservation_audit_missing_provider; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.reservation_audit_missing_provider AS
 SELECT e.id AS entity_id,
    e.name,
    e.slug,
    COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) AS reservation_url,
    ms.reservation_provider AS extracted_provider,
    ms.extraction_confidence,
    e.primary_vertical,
    e.website
   FROM ((public.entities e
     LEFT JOIN public.merchant_signals ms ON ((ms.entity_id = e.id)))
     LEFT JOIN public.reservation_provider_matches rpm ON ((rpm.entity_id = e.id)))
  WHERE ((COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) IS NOT NULL) AND (COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) <> ''::text) AND (rpm.provider IS NULL) AND ((ms.reservation_provider IS NULL) OR (ms.reservation_provider = ''::text) OR (ms.reservation_provider = 'other'::text)))
  ORDER BY ms.extraction_confidence DESC NULLS LAST;


--
-- Name: reservation_audit_unvalidated; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.reservation_audit_unvalidated AS
 SELECT rpm.entity_id,
    e.name,
    e.slug,
    rpm.provider,
    rpm.match_status,
    rpm.match_score,
    rpm.confidence_level,
    rpm.booking_url,
    rpm.validation_source,
    rpm.last_checked_at
   FROM (public.reservation_provider_matches rpm
     JOIN public.entities e ON ((e.id = rpm.entity_id)))
  WHERE (rpm.match_status <> 'matched'::text)
  ORDER BY rpm.match_score DESC NULLS LAST;


--
-- Name: reservation_coverage_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.reservation_coverage_summary AS
 SELECT COALESCE(rpm.provider, ms.reservation_provider, 'none'::text) AS provider,
    (count(DISTINCT e.id))::integer AS entity_count,
    (count(DISTINCT
        CASE
            WHEN rpm.is_renderable THEN e.id
            ELSE NULL::text
        END))::integer AS renderable_count,
    (count(DISTINCT
        CASE
            WHEN (rpm.match_status = 'matched'::text) THEN e.id
            ELSE NULL::text
        END))::integer AS matched_count,
    (count(DISTINCT
        CASE
            WHEN (rpm.match_status = 'probable'::text) THEN e.id
            ELSE NULL::text
        END))::integer AS probable_count,
    (count(DISTINCT
        CASE
            WHEN (rpm.match_status = 'ambiguous'::text) THEN e.id
            ELSE NULL::text
        END))::integer AS ambiguous_count,
    (count(DISTINCT
        CASE
            WHEN ((ms.reservation_url IS NOT NULL) AND (rpm.id IS NULL)) THEN e.id
            ELSE NULL::text
        END))::integer AS extracted_not_validated
   FROM ((public.entities e
     LEFT JOIN public.reservation_provider_matches rpm ON ((rpm.entity_id = e.id)))
     LEFT JOIN public.merchant_signals ms ON ((ms.entity_id = e.id)))
  WHERE ((e.primary_vertical = ANY (ARRAY['EAT'::public."PrimaryVertical", 'DRINKS'::public."PrimaryVertical"])) AND ((rpm.id IS NOT NULL) OR (ms.reservation_url IS NOT NULL)))
  GROUP BY COALESCE(rpm.provider, ms.reservation_provider, 'none'::text)
  ORDER BY ((count(DISTINCT e.id))::integer) DESC;


--
-- Name: reservation_provider_audit_queue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.reservation_provider_audit_queue AS
 SELECT rpm.entity_id,
    e.name AS entity_name,
    e.slug,
    rpm.provider,
    rpm.match_status,
    rpm.confidence_level,
    rpm.booking_url,
    rpm.match_score,
    rpm.match_signals,
    rpm.validation_source,
    rpm.last_checked_at,
    ms.reservation_url AS merchant_signal_url,
    ms.reservation_provider AS merchant_signal_provider,
    ms.extraction_confidence
   FROM ((public.reservation_provider_matches rpm
     JOIN public.entities e ON ((e.id = rpm.entity_id)))
     LEFT JOIN public.merchant_signals ms ON ((ms.entity_id = rpm.entity_id)))
  WHERE ((rpm.match_status = ANY (ARRAY['probable'::text, 'ambiguous'::text])) OR ((rpm.match_status = 'matched'::text) AND (rpm.confidence_level = 'weak'::text)))
  ORDER BY rpm.match_score DESC NULLS LAST, rpm.last_checked_at;


--
-- Name: resolution_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resolution_links (
    id text NOT NULL,
    raw_record_id text NOT NULL,
    golden_record_id text,
    resolution_type public."ResolutionType" NOT NULL,
    confidence double precision,
    match_method public."MatchMethod" NOT NULL,
    resolver_version text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: resolved_reservations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.resolved_reservations AS
 SELECT e.id AS entity_id,
    e.slug,
    e.name,
        CASE
            WHEN (rpm.provider = ANY (ARRAY['resy'::text, 'opentable'::text, 'tock'::text, 'sevenrooms'::text])) THEN rpm.provider
            ELSE NULL::text
        END AS resolved_provider,
    COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) AS resolved_reservation_url,
        CASE
            WHEN ((rpm.id IS NOT NULL) AND rpm.is_renderable) THEN 'validated'::text
            WHEN (ms.reservation_url IS NOT NULL) THEN 'extracted'::text
            WHEN (e.reservation_url IS NOT NULL) THEN 'legacy'::text
            ELSE NULL::text
        END AS resolved_source,
    COALESCE(rpm.confidence_level, 'weak'::text) AS resolved_confidence,
        CASE
            WHEN (rpm.provider = 'resy'::text) THEN 'Reserve on Resy'::text
            WHEN (rpm.provider = 'opentable'::text) THEN 'Reserve on OpenTable'::text
            WHEN (rpm.provider = 'tock'::text) THEN 'Reserve on Tock'::text
            WHEN (rpm.provider = 'sevenrooms'::text) THEN 'Reserve on SevenRooms'::text
            ELSE 'Reserve'::text
        END AS button_label,
        CASE
            WHEN ((COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) IS NOT NULL) AND (COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) <> ''::text)) THEN true
            ELSE false
        END AS is_renderable
   FROM ((public.entities e
     LEFT JOIN public.reservation_provider_matches rpm ON (((rpm.entity_id = e.id) AND (rpm.is_renderable = true))))
     LEFT JOIN public.merchant_signals ms ON ((ms.entity_id = e.id)))
  WHERE ((COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) IS NOT NULL) AND (COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) <> ''::text));


--
-- Name: restaurant_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_groups (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    visibility public."Visibility" NOT NULL,
    description text,
    anchor_city text,
    website text,
    location_count_estimate integer,
    sources jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: review_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_audit_log (
    log_id text NOT NULL,
    queue_id text NOT NULL,
    resolved_by text NOT NULL,
    resolution text NOT NULL,
    decision_time_ms integer,
    resolved_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: review_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_queue (
    queue_id text NOT NULL,
    canonical_id text,
    raw_id_a text NOT NULL,
    raw_id_b text,
    conflict_type text NOT NULL,
    match_confidence numeric(4,3),
    conflicting_fields jsonb,
    priority integer DEFAULT 5 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    resolution text,
    resolution_notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_to text,
    resolved_by text,
    resolved_at timestamp(3) without time zone,
    identity_enrichment_status text,
    identity_anchor_count integer,
    latest_identity_confidence numeric(4,3),
    latest_identity_run_id text
);


--
-- Name: sanction_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sanction_conflicts (
    conflict_id text DEFAULT (gen_random_uuid())::text NOT NULL,
    entity_id text NOT NULL,
    attribute_key text NOT NULL,
    claim_ids text[] NOT NULL,
    conflict_reason text NOT NULL,
    status public."SanctionConflictStatus" DEFAULT 'OPEN'::public."SanctionConflictStatus" NOT NULL,
    resolved_claim_id text,
    resolved_by text,
    resolved_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: skai_chunks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skai_chunks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_registry (
    id text NOT NULL,
    display_name text NOT NULL,
    source_type public."SourceType" NOT NULL,
    trust_tier integer NOT NULL,
    requires_human_approval boolean DEFAULT false NOT NULL,
    base_domain text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id text NOT NULL,
    name text NOT NULL,
    domain text[] DEFAULT '{}'::text[],
    trust_tier double precision DEFAULT 2 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sources_trust_tier_check CHECK (((trust_tier >= (0)::double precision) AND (trust_tier <= (1)::double precision)))
);


--
-- Name: tag_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_versions (
    version text NOT NULL,
    tag_weight_config jsonb,
    depends_on_energy_version text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    password_hash text,
    avatar_url text,
    subscription_tier text DEFAULT 'free'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: v_places_la_bbox_golden; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_places_la_bbox_golden AS
 SELECT e.id,
    e.slug,
    e.google_place_id,
    e.name,
    e.address,
    e.latitude,
    e.longitude,
    e.phone,
    e.website AS places_website,
    e.description AS places_description,
    gr.website AS golden_website,
    gr.description AS golden_description,
    gr.about_copy AS golden_about_copy
   FROM (public.entities e
     JOIN public.golden_records gr ON ((gr.google_place_id = e.google_place_id)))
  WHERE (((gr.lat >= 33.70) AND (gr.lat <= 34.85)) AND ((gr.lng >= '-118.95'::numeric) AND (gr.lng <= '-117.60'::numeric)));


--
-- Name: viewer_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viewer_bookmarks (
    id text NOT NULL,
    viewer_user_id text,
    entity_id text NOT NULL,
    visited boolean DEFAULT false NOT NULL,
    personal_note text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: winelist_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.winelist_signals (
    id text NOT NULL,
    golden_record_id text NOT NULL,
    schema_version integer DEFAULT 1 NOT NULL,
    model_version text,
    source_scraped_at timestamp(3) without time zone,
    analyzed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public.signal_status DEFAULT 'ok'::public.signal_status NOT NULL,
    error text,
    payload jsonb,
    evidence jsonb,
    confidence double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: Actor Actor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Actor"
    ADD CONSTRAINT "Actor_pkey" PRIMARY KEY (id);


--
-- Name: EntityActorRelationship EntityActorRelationship_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntityActorRelationship"
    ADD CONSTRAINT "EntityActorRelationship_pkey" PRIMARY KEY (id);


--
-- Name: FieldsMembership FieldsMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldsMembership"
    ADD CONSTRAINT "FieldsMembership_pkey" PRIMARY KEY (id);


--
-- Name: TraceSignalsCache TraceSignalsCache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TraceSignalsCache"
    ADD CONSTRAINT "TraceSignalsCache_pkey" PRIMARY KEY (id);


--
-- Name: activity_spots activity_spots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_spots
    ADD CONSTRAINT activity_spots_pkey PRIMARY KEY (id);


--
-- Name: attribute_registry attribute_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_registry
    ADD CONSTRAINT attribute_registry_pkey PRIMARY KEY (attribute_key);


--
-- Name: canonical_entity_state canonical_entity_state_google_place_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_entity_state
    ADD CONSTRAINT canonical_entity_state_google_place_id_key UNIQUE (google_place_id);


--
-- Name: canonical_entity_state canonical_entity_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_entity_state
    ADD CONSTRAINT canonical_entity_state_pkey PRIMARY KEY (entity_id);


--
-- Name: canonical_sanctions canonical_sanctions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_sanctions
    ADD CONSTRAINT canonical_sanctions_pkey PRIMARY KEY (sanction_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: coverage_runs coverage_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverage_runs
    ADD CONSTRAINT coverage_runs_pkey PRIMARY KEY (id);


--
-- Name: coverage_sources coverage_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverage_sources
    ADD CONSTRAINT coverage_sources_pkey PRIMARY KEY (id);


--
-- Name: derived_signals derived_signals_entity_id_signal_key_signal_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.derived_signals
    ADD CONSTRAINT derived_signals_entity_id_signal_key_signal_version_key UNIQUE (entity_id, signal_key, signal_version);


--
-- Name: derived_signals derived_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.derived_signals
    ADD CONSTRAINT derived_signals_pkey PRIMARY KEY (signal_id);


--
-- Name: energy_scores energy_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_scores
    ADD CONSTRAINT energy_scores_pkey PRIMARY KEY (id);


--
-- Name: energy_scores energy_scores_place_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_scores
    ADD CONSTRAINT energy_scores_place_id_version_key UNIQUE (entity_id, version);


--
-- Name: energy_versions energy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_versions
    ADD CONSTRAINT energy_versions_pkey PRIMARY KEY (version);


--
-- Name: entity_issues entity_issues_entity_id_issue_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_issues
    ADD CONSTRAINT entity_issues_entity_id_issue_type_key UNIQUE (entity_id, issue_type);


--
-- Name: entity_issues entity_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_issues
    ADD CONSTRAINT entity_issues_pkey PRIMARY KEY (id);


--
-- Name: entity_links entity_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_pkey PRIMARY KEY (canonical_id, raw_id);


--
-- Name: golden_records golden_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.golden_records
    ADD CONSTRAINT golden_records_pkey PRIMARY KEY (canonical_id);


--
-- Name: gpid_resolution_queue gpid_resolution_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpid_resolution_queue
    ADD CONSTRAINT gpid_resolution_queue_pkey PRIMARY KEY (id);


--
-- Name: identity_enrichment_runs identity_enrichment_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_enrichment_runs
    ADD CONSTRAINT identity_enrichment_runs_pkey PRIMARY KEY (id);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: instagram_accounts instagram_accounts_instagram_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_instagram_user_id_key UNIQUE (instagram_user_id);


--
-- Name: instagram_accounts instagram_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_pkey PRIMARY KEY (id);


--
-- Name: instagram_insight_snapshots instagram_insight_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_insight_snapshots
    ADD CONSTRAINT instagram_insight_snapshots_pkey PRIMARY KEY (id);


--
-- Name: instagram_media instagram_media_instagram_media_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_media
    ADD CONSTRAINT instagram_media_instagram_media_id_key UNIQUE (instagram_media_id);


--
-- Name: instagram_media instagram_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_media
    ADD CONSTRAINT instagram_media_pkey PRIMARY KEY (id);


--
-- Name: interpretation_cache interpretation_cache_entity_id_output_type_prompt_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interpretation_cache
    ADD CONSTRAINT interpretation_cache_entity_id_output_type_prompt_version_key UNIQUE (entity_id, output_type, prompt_version);


--
-- Name: interpretation_cache interpretation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interpretation_cache
    ADD CONSTRAINT interpretation_cache_pkey PRIMARY KEY (cache_id);


--
-- Name: lists lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: map_places map_places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_places
    ADD CONSTRAINT map_places_pkey PRIMARY KEY (id);


--
-- Name: menu_fetches menu_fetches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_fetches
    ADD CONSTRAINT menu_fetches_pkey PRIMARY KEY (id);


--
-- Name: menu_signals menu_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_signals
    ADD CONSTRAINT menu_signals_pkey PRIMARY KEY (id);


--
-- Name: merchant_enrichment_runs merchant_enrichment_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_enrichment_runs
    ADD CONSTRAINT merchant_enrichment_runs_pkey PRIMARY KEY (id);


--
-- Name: merchant_signals merchant_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_signals
    ADD CONSTRAINT merchant_signals_pkey PRIMARY KEY (entity_id);


--
-- Name: merchant_surface_artifacts merchant_surface_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_surface_artifacts
    ADD CONSTRAINT merchant_surface_artifacts_pkey PRIMARY KEY (id);


--
-- Name: merchant_surface_scans merchant_surface_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_surface_scans
    ADD CONSTRAINT merchant_surface_scans_pkey PRIMARY KEY (id);


--
-- Name: merchant_surfaces merchant_surfaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_surfaces
    ADD CONSTRAINT merchant_surfaces_pkey PRIMARY KEY (id);


--
-- Name: observed_claims observed_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observed_claims
    ADD CONSTRAINT observed_claims_pkey PRIMARY KEY (claim_id);


--
-- Name: operational_overlays operational_overlays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_overlays
    ADD CONSTRAINT operational_overlays_pkey PRIMARY KEY (id);


--
-- Name: operator_place_candidates operator_place_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator_place_candidates
    ADD CONSTRAINT operator_place_candidates_pkey PRIMARY KEY (id);


--
-- Name: park_facility_relationships park_facility_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_facility_relationships
    ADD CONSTRAINT park_facility_relationships_pkey PRIMARY KEY (id);


--
-- Name: park_facility_relationships park_facility_relationships_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_facility_relationships
    ADD CONSTRAINT park_facility_relationships_unique UNIQUE (parent_entity_id, child_entity_id, relationship_type);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: person_places person_places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_places
    ADD CONSTRAINT person_places_pkey PRIMARY KEY (id);


--
-- Name: place_actor_relationships place_actor_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_actor_relationships
    ADD CONSTRAINT place_actor_relationships_pkey PRIMARY KEY (id);


--
-- Name: place_appearances place_appearances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_appearances
    ADD CONSTRAINT place_appearances_pkey PRIMARY KEY (id);


--
-- Name: place_coverage_status place_coverage_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_coverage_status
    ADD CONSTRAINT place_coverage_status_pkey PRIMARY KEY (id);


--
-- Name: place_job_log place_job_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_job_log
    ADD CONSTRAINT place_job_log_pkey PRIMARY KEY (id);


--
-- Name: place_photo_eval place_photo_eval_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_photo_eval
    ADD CONSTRAINT place_photo_eval_pkey PRIMARY KEY (id);


--
-- Name: place_tag_scores place_tag_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_tag_scores
    ADD CONSTRAINT place_tag_scores_pkey PRIMARY KEY (id);


--
-- Name: place_tag_scores place_tag_scores_place_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_tag_scores
    ADD CONSTRAINT place_tag_scores_place_id_version_key UNIQUE (entity_id, version);


--
-- Name: entities places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT places_pkey PRIMARY KEY (id);


--
-- Name: proposed_signals proposed_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposed_signals
    ADD CONSTRAINT proposed_signals_pkey PRIMARY KEY (id);


--
-- Name: provenance provenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provenance
    ADD CONSTRAINT provenance_pkey PRIMARY KEY (id);


--
-- Name: raw_records raw_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_records
    ADD CONSTRAINT raw_records_pkey PRIMARY KEY (raw_id);


--
-- Name: reservation_provider_matches reservation_provider_matches_entity_id_provider_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_provider_matches
    ADD CONSTRAINT reservation_provider_matches_entity_id_provider_key UNIQUE (entity_id, provider);


--
-- Name: reservation_provider_matches reservation_provider_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_provider_matches
    ADD CONSTRAINT reservation_provider_matches_pkey PRIMARY KEY (id);


--
-- Name: resolution_links resolution_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resolution_links
    ADD CONSTRAINT resolution_links_pkey PRIMARY KEY (id);


--
-- Name: restaurant_groups restaurant_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_groups
    ADD CONSTRAINT restaurant_groups_pkey PRIMARY KEY (id);


--
-- Name: review_audit_log review_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_audit_log
    ADD CONSTRAINT review_audit_log_pkey PRIMARY KEY (log_id);


--
-- Name: review_queue review_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_queue
    ADD CONSTRAINT review_queue_pkey PRIMARY KEY (queue_id);


--
-- Name: sanction_conflicts sanction_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sanction_conflicts
    ADD CONSTRAINT sanction_conflicts_pkey PRIMARY KEY (conflict_id);


--
-- Name: source_registry source_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_registry
    ADD CONSTRAINT source_registry_pkey PRIMARY KEY (id);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: tag_versions tag_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_versions
    ADD CONSTRAINT tag_versions_pkey PRIMARY KEY (version);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: viewer_bookmarks viewer_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewer_bookmarks
    ADD CONSTRAINT viewer_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: winelist_signals winelist_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winelist_signals
    ADD CONSTRAINT winelist_signals_pkey PRIMARY KEY (id);


--
-- Name: Actor_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Actor_name_idx" ON public."Actor" USING btree (name);


--
-- Name: Actor_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Actor_slug_idx" ON public."Actor" USING btree (slug);


--
-- Name: Actor_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Actor_slug_key" ON public."Actor" USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: EntityActorRelationship_actor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EntityActorRelationship_actor_id_idx" ON public."EntityActorRelationship" USING btree (actor_id);


--
-- Name: EntityActorRelationship_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EntityActorRelationship_entity_id_idx" ON public."EntityActorRelationship" USING btree (entity_id);


--
-- Name: FieldsMembership_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FieldsMembership_entity_id_idx" ON public."FieldsMembership" USING btree (entity_id);


--
-- Name: TraceSignalsCache_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TraceSignalsCache_entity_id_idx" ON public."TraceSignalsCache" USING btree (entity_id);


--
-- Name: TraceSignalsCache_entity_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TraceSignalsCache_entity_id_key" ON public."TraceSignalsCache" USING btree (entity_id);


--
-- Name: activity_spots_layer_type_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_spots_layer_type_city_idx ON public.activity_spots USING btree (layer_type, city);


--
-- Name: activity_spots_layer_type_latitude_longitude_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_spots_layer_type_latitude_longitude_idx ON public.activity_spots USING btree (layer_type, latitude, longitude);


--
-- Name: activity_spots_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX activity_spots_slug_key ON public.activity_spots USING btree (slug);


--
-- Name: activity_spots_source_source_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_spots_source_source_id_idx ON public.activity_spots USING btree (source, source_id);


--
-- Name: canonical_entity_state_google_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX canonical_entity_state_google_place_id_idx ON public.canonical_entity_state USING btree (google_place_id);


--
-- Name: canonical_entity_state_neighborhood_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX canonical_entity_state_neighborhood_idx ON public.canonical_entity_state USING btree (neighborhood);


--
-- Name: canonical_sanctions_claim_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX canonical_sanctions_claim_id_idx ON public.canonical_sanctions USING btree (claim_id);


--
-- Name: canonical_sanctions_entity_id_attribute_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX canonical_sanctions_entity_id_attribute_key_idx ON public.canonical_sanctions USING btree (entity_id, attribute_key);


--
-- Name: canonical_sanctions_entity_id_attribute_key_is_current_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX canonical_sanctions_entity_id_attribute_key_is_current_idx ON public.canonical_sanctions USING btree (entity_id, attribute_key, is_current);


--
-- Name: canonical_sanctions_one_current_per_attribute; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX canonical_sanctions_one_current_per_attribute ON public.canonical_sanctions USING btree (entity_id, attribute_key) WHERE (is_current = true);


--
-- Name: categories_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);


--
-- Name: coverage_sources_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coverage_sources_entity_id_idx ON public.coverage_sources USING btree (entity_id);


--
-- Name: coverage_sources_entity_id_url_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX coverage_sources_entity_id_url_key ON public.coverage_sources USING btree (entity_id, url);


--
-- Name: derived_signals_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX derived_signals_entity_id_idx ON public.derived_signals USING btree (entity_id);


--
-- Name: derived_signals_signal_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX derived_signals_signal_key_idx ON public.derived_signals USING btree (signal_key);


--
-- Name: energy_scores_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX energy_scores_place_id_idx ON public.energy_scores USING btree (entity_id);


--
-- Name: energy_scores_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX energy_scores_version_idx ON public.energy_scores USING btree (version);


--
-- Name: entities_enrichment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entities_enrichment_status_idx ON public.entities USING btree (enrichment_status);


--
-- Name: entities_google_place_id_unique_nonempty; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX entities_google_place_id_unique_nonempty ON public.entities USING btree (google_place_id) WHERE ((google_place_id IS NOT NULL) AND (btrim(google_place_id) <> ''::text));


--
-- Name: entities_operating_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entities_operating_status_idx ON public.entities USING btree (operating_status);


--
-- Name: entities_publication_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entities_publication_status_idx ON public.entities USING btree (publication_status);


--
-- Name: entity_links_canonical_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entity_links_canonical_id_idx ON public.entity_links USING btree (canonical_id);


--
-- Name: entity_links_match_method_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entity_links_match_method_idx ON public.entity_links USING btree (match_method);


--
-- Name: entity_links_raw_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entity_links_raw_id_idx ON public.entity_links USING btree (raw_id);


--
-- Name: golden_records_business_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX golden_records_business_status_idx ON public.golden_records USING btree (business_status);


--
-- Name: golden_records_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX golden_records_category_idx ON public.golden_records USING btree (category);


--
-- Name: golden_records_neighborhood_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX golden_records_neighborhood_idx ON public.golden_records USING btree (neighborhood);


--
-- Name: golden_records_placekey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX golden_records_placekey_key ON public.golden_records USING btree (placekey);


--
-- Name: golden_records_promotion_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX golden_records_promotion_status_idx ON public.golden_records USING btree (promotion_status);


--
-- Name: golden_records_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX golden_records_slug_idx ON public.golden_records USING btree (slug);


--
-- Name: golden_records_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX golden_records_slug_key ON public.golden_records USING btree (slug);


--
-- Name: gpid_resolution_queue_human_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gpid_resolution_queue_human_status_idx ON public.gpid_resolution_queue USING btree (human_status);


--
-- Name: gpid_resolution_queue_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gpid_resolution_queue_place_id_idx ON public.gpid_resolution_queue USING btree (entity_id);


--
-- Name: gpid_resolution_queue_reason_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gpid_resolution_queue_reason_code_idx ON public.gpid_resolution_queue USING btree (reason_code);


--
-- Name: gpid_resolution_queue_resolver_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gpid_resolution_queue_resolver_status_idx ON public.gpid_resolution_queue USING btree (resolver_status);


--
-- Name: identity_enrichment_runs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_enrichment_runs_created_at_idx ON public.identity_enrichment_runs USING btree (created_at);


--
-- Name: identity_enrichment_runs_decision_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_enrichment_runs_decision_status_idx ON public.identity_enrichment_runs USING btree (decision_status);


--
-- Name: identity_enrichment_runs_raw_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_enrichment_runs_raw_id_idx ON public.identity_enrichment_runs USING btree (raw_id);


--
-- Name: identity_enrichment_runs_review_queue_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_enrichment_runs_review_queue_id_idx ON public.identity_enrichment_runs USING btree (review_queue_id);


--
-- Name: idx_entity_issues_problem_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_issues_problem_status ON public.entity_issues USING btree (problem_class, status);


--
-- Name: idx_entity_issues_severity_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_issues_severity_status ON public.entity_issues USING btree (severity, status);


--
-- Name: idx_entity_issues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_issues_status ON public.entity_issues USING btree (status);


--
-- Name: idx_entity_issues_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_issues_type_status ON public.entity_issues USING btree (issue_type, status);


--
-- Name: idx_park_facility_rel_child; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_park_facility_rel_child ON public.park_facility_relationships USING btree (child_entity_id);


--
-- Name: idx_park_facility_rel_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_park_facility_rel_parent ON public.park_facility_relationships USING btree (parent_entity_id);


--
-- Name: idx_park_facility_rel_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_park_facility_rel_type ON public.park_facility_relationships USING btree (relationship_type);


--
-- Name: idx_rpm_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpm_entity_id ON public.reservation_provider_matches USING btree (entity_id);


--
-- Name: idx_rpm_match_status_last_checked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpm_match_status_last_checked ON public.reservation_provider_matches USING btree (match_status, last_checked_at);


--
-- Name: idx_rpm_provider_is_renderable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpm_provider_is_renderable ON public.reservation_provider_matches USING btree (provider, is_renderable);


--
-- Name: idx_rpm_provider_match_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpm_provider_match_status ON public.reservation_provider_matches USING btree (provider, match_status);


--
-- Name: import_jobs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX import_jobs_status_idx ON public.import_jobs USING btree (status);


--
-- Name: import_jobs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX import_jobs_user_id_idx ON public.import_jobs USING btree (user_id);


--
-- Name: instagram_accounts_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instagram_accounts_entity_id_idx ON public.instagram_accounts USING btree (entity_id);


--
-- Name: instagram_accounts_username_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instagram_accounts_username_idx ON public.instagram_accounts USING btree (username);


--
-- Name: instagram_insight_snapshots_observed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instagram_insight_snapshots_observed_at_idx ON public.instagram_insight_snapshots USING btree (observed_at);


--
-- Name: instagram_insight_snapshots_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instagram_insight_snapshots_subject_idx ON public.instagram_insight_snapshots USING btree (subject_type, subject_id);


--
-- Name: instagram_insight_snapshots_timeseries_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instagram_insight_snapshots_timeseries_idx ON public.instagram_insight_snapshots USING btree (subject_id, metric_name, observed_at);


--
-- Name: instagram_media_instagram_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instagram_media_instagram_user_id_idx ON public.instagram_media USING btree (instagram_user_id);


--
-- Name: instagram_media_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instagram_media_timestamp_idx ON public.instagram_media USING btree ("timestamp");


--
-- Name: instagram_media_user_id_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instagram_media_user_id_timestamp_idx ON public.instagram_media USING btree (instagram_user_id, "timestamp");


--
-- Name: interpretation_cache_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interpretation_cache_entity_id_idx ON public.interpretation_cache USING btree (entity_id);


--
-- Name: interpretation_cache_entity_id_output_type_is_current_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interpretation_cache_entity_id_output_type_is_current_idx ON public.interpretation_cache USING btree (entity_id, output_type, is_current);


--
-- Name: lists_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lists_published_idx ON public.lists USING btree (published);


--
-- Name: lists_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lists_slug_idx ON public.lists USING btree (slug);


--
-- Name: lists_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lists_slug_key ON public.lists USING btree (slug);


--
-- Name: lists_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lists_status_idx ON public.lists USING btree (status);


--
-- Name: lists_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lists_user_id_idx ON public.lists USING btree (user_id);


--
-- Name: locations_google_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_google_place_id_idx ON public.locations USING btree (google_place_id);


--
-- Name: locations_list_id_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_list_id_category_idx ON public.locations USING btree (list_id, category);


--
-- Name: locations_list_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_list_id_idx ON public.locations USING btree (list_id);


--
-- Name: locations_list_id_order_index_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_list_id_order_index_idx ON public.locations USING btree (list_id, order_index);


--
-- Name: map_places_map_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX map_places_map_id_idx ON public.map_places USING btree (map_id);


--
-- Name: map_places_map_id_order_index_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX map_places_map_id_order_index_idx ON public.map_places USING btree (map_id, order_index);


--
-- Name: map_places_map_id_place_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX map_places_map_id_place_id_key ON public.map_places USING btree (map_id, entity_id);


--
-- Name: map_places_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX map_places_place_id_idx ON public.map_places USING btree (entity_id);


--
-- Name: menu_fetches_content_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_fetches_content_hash_idx ON public.menu_fetches USING btree (content_hash);


--
-- Name: menu_fetches_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_fetches_entity_id_idx ON public.menu_fetches USING btree (entity_id);


--
-- Name: menu_fetches_extraction_quality_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_fetches_extraction_quality_idx ON public.menu_fetches USING btree (extraction_quality);


--
-- Name: menu_fetches_fetched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_fetches_fetched_at_idx ON public.menu_fetches USING btree (fetched_at);


--
-- Name: menu_signals_analyzed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_signals_analyzed_at_idx ON public.menu_signals USING btree (analyzed_at);


--
-- Name: menu_signals_golden_record_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX menu_signals_golden_record_id_key ON public.menu_signals USING btree (golden_record_id);


--
-- Name: menu_signals_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_signals_status_idx ON public.menu_signals USING btree (status);


--
-- Name: merchant_enrichment_runs_fetched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_enrichment_runs_fetched_at_idx ON public.merchant_enrichment_runs USING btree (fetched_at);


--
-- Name: merchant_enrichment_runs_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_enrichment_runs_place_id_idx ON public.merchant_enrichment_runs USING btree (entity_id);


--
-- Name: merchant_surface_artifacts_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surface_artifacts_created_at_idx ON public.merchant_surface_artifacts USING btree (created_at);


--
-- Name: merchant_surface_artifacts_dedupe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX merchant_surface_artifacts_dedupe_idx ON public.merchant_surface_artifacts USING btree (merchant_surface_id, artifact_type, artifact_version);


--
-- Name: merchant_surface_artifacts_surface_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surface_artifacts_surface_id_idx ON public.merchant_surface_artifacts USING btree (merchant_surface_id);


--
-- Name: merchant_surface_artifacts_type_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surface_artifacts_type_version_idx ON public.merchant_surface_artifacts USING btree (artifact_type, artifact_version);


--
-- Name: merchant_surface_scans_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surface_scans_entity_id_idx ON public.merchant_surface_scans USING btree (entity_id);


--
-- Name: merchant_surface_scans_fetched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surface_scans_fetched_at_idx ON public.merchant_surface_scans USING btree (fetched_at);


--
-- Name: merchant_surfaces_content_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surfaces_content_hash_idx ON public.merchant_surfaces USING btree (content_hash);


--
-- Name: merchant_surfaces_discovered_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surfaces_discovered_at_idx ON public.merchant_surfaces USING btree (discovered_at);


--
-- Name: merchant_surfaces_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surfaces_entity_id_idx ON public.merchant_surfaces USING btree (entity_id);


--
-- Name: merchant_surfaces_entity_id_surface_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surfaces_entity_id_surface_type_idx ON public.merchant_surfaces USING btree (entity_id, surface_type);


--
-- Name: merchant_surfaces_fetch_parse_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surfaces_fetch_parse_status_idx ON public.merchant_surfaces USING btree (fetch_status, parse_status);


--
-- Name: merchant_surfaces_surface_type_extraction_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surfaces_surface_type_extraction_idx ON public.merchant_surfaces USING btree (surface_type, extraction_status);


--
-- Name: merchant_surfaces_surface_type_fetch_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_surfaces_surface_type_fetch_status_idx ON public.merchant_surfaces USING btree (surface_type, fetch_status);


--
-- Name: observed_claims_entity_id_attribute_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX observed_claims_entity_id_attribute_key_idx ON public.observed_claims USING btree (entity_id, attribute_key);


--
-- Name: observed_claims_entity_id_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX observed_claims_entity_id_is_active_idx ON public.observed_claims USING btree (entity_id, is_active);


--
-- Name: observed_claims_extracted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX observed_claims_extracted_at_idx ON public.observed_claims USING btree (extracted_at);


--
-- Name: observed_claims_source_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX observed_claims_source_id_idx ON public.observed_claims USING btree (source_id);


--
-- Name: operational_overlays_ends_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operational_overlays_ends_at_idx ON public.operational_overlays USING btree (ends_at);


--
-- Name: operational_overlays_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operational_overlays_place_id_idx ON public.operational_overlays USING btree (place_id);


--
-- Name: operational_overlays_source_signal_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX operational_overlays_source_signal_id_key ON public.operational_overlays USING btree (source_signal_id);


--
-- Name: operational_overlays_starts_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operational_overlays_starts_at_idx ON public.operational_overlays USING btree (starts_at);


--
-- Name: operator_place_candidates_actor_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operator_place_candidates_actor_id_status_idx ON public.operator_place_candidates USING btree (actor_id, status);


--
-- Name: operator_place_candidates_actor_url_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX operator_place_candidates_actor_url_unique ON public.operator_place_candidates USING btree (actor_id, candidate_url) WHERE (candidate_url IS NOT NULL);


--
-- Name: operator_place_candidates_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operator_place_candidates_place_id_idx ON public.operator_place_candidates USING btree (entity_id);


--
-- Name: password_reset_tokens_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_tokens_expires_at_idx ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: password_reset_tokens_token_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_tokens_token_hash_idx ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: password_reset_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_tokens_user_id_idx ON public.password_reset_tokens USING btree (user_id);


--
-- Name: people_restaurant_group_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_restaurant_group_id_idx ON public.people USING btree (restaurant_group_id);


--
-- Name: people_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_slug_idx ON public.people USING btree (slug);


--
-- Name: people_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX people_slug_key ON public.people USING btree (slug);


--
-- Name: people_visibility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX people_visibility_idx ON public.people USING btree (visibility);


--
-- Name: person_places_current_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_places_current_idx ON public.person_places USING btree (current);


--
-- Name: person_places_person_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_places_person_id_idx ON public.person_places USING btree (person_id);


--
-- Name: person_places_person_id_place_id_role_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX person_places_person_id_place_id_role_key ON public.person_places USING btree (person_id, entity_id, role);


--
-- Name: person_places_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_places_place_id_idx ON public.person_places USING btree (entity_id);


--
-- Name: place_actor_relationships_actor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_actor_relationships_actor_id_idx ON public.place_actor_relationships USING btree (actor_id);


--
-- Name: place_actor_relationships_place_id_actor_id_role_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX place_actor_relationships_place_id_actor_id_role_key ON public.place_actor_relationships USING btree (entity_id, actor_id, role);


--
-- Name: place_actor_relationships_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_actor_relationships_place_id_idx ON public.place_actor_relationships USING btree (entity_id);


--
-- Name: place_appearances_host_place_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_appearances_host_place_id_status_idx ON public.place_appearances USING btree (host_entity_id, status);


--
-- Name: place_appearances_subject_place_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_appearances_subject_place_id_status_idx ON public.place_appearances USING btree (subject_entity_id, status);


--
-- Name: place_coverage_status_dedupe_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX place_coverage_status_dedupe_key_key ON public.place_coverage_status USING btree (dedupe_key);


--
-- Name: place_coverage_status_last_attempt_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_coverage_status_last_attempt_status_idx ON public.place_coverage_status USING btree (last_attempt_status);


--
-- Name: place_coverage_status_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_coverage_status_place_id_idx ON public.place_coverage_status USING btree (entity_id);


--
-- Name: place_job_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_job_log_created_at_idx ON public.place_job_log USING btree (created_at);


--
-- Name: place_job_log_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_job_log_entity_id_idx ON public.place_job_log USING btree (entity_id);


--
-- Name: place_job_log_job_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_job_log_job_type_idx ON public.place_job_log USING btree (job_type);


--
-- Name: place_photo_eval_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_photo_eval_place_id_idx ON public.place_photo_eval USING btree (entity_id);


--
-- Name: place_photo_eval_place_id_photo_ref_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX place_photo_eval_place_id_photo_ref_key ON public.place_photo_eval USING btree (entity_id, photo_ref);


--
-- Name: place_tag_scores_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_tag_scores_place_id_idx ON public.place_tag_scores USING btree (entity_id);


--
-- Name: place_tag_scores_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_tag_scores_version_idx ON public.place_tag_scores USING btree (version);


--
-- Name: places_business_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_business_status_idx ON public.entities USING btree (business_status);


--
-- Name: places_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_category_id_idx ON public.entities USING btree (category_id);


--
-- Name: places_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_category_idx ON public.entities USING btree (category);


--
-- Name: places_google_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_google_place_id_idx ON public.entities USING btree (google_place_id);


--
-- Name: places_google_place_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX places_google_place_id_key ON public.entities USING btree (google_place_id);


--
-- Name: places_last_enriched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_last_enriched_at_idx ON public.entities USING btree (last_enriched_at) WHERE (last_enriched_at IS NOT NULL);


--
-- Name: places_needs_human_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_needs_human_review_idx ON public.entities USING btree (needs_human_review) WHERE (needs_human_review = true);


--
-- Name: places_neighborhood_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_neighborhood_idx ON public.entities USING btree (neighborhood);


--
-- Name: places_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_parent_id_idx ON public.entities USING btree (parent_id);


--
-- Name: places_primary_vertical_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_primary_vertical_idx ON public.entities USING btree (primary_vertical);


--
-- Name: places_restaurant_group_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_restaurant_group_id_idx ON public.entities USING btree (restaurant_group_id);


--
-- Name: places_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX places_slug_key ON public.entities USING btree (slug);


--
-- Name: places_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_status_idx ON public.entities USING btree (status);


--
-- Name: proposed_signals_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposed_signals_created_at_idx ON public.proposed_signals USING btree (created_at);


--
-- Name: proposed_signals_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposed_signals_place_id_idx ON public.proposed_signals USING btree (place_id);


--
-- Name: proposed_signals_signal_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposed_signals_signal_type_idx ON public.proposed_signals USING btree (signal_type);


--
-- Name: proposed_signals_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposed_signals_status_idx ON public.proposed_signals USING btree (status);


--
-- Name: provenance_added_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provenance_added_by_idx ON public.provenance USING btree (added_by);


--
-- Name: provenance_import_batch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provenance_import_batch_idx ON public.provenance USING btree (import_batch);


--
-- Name: provenance_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provenance_place_id_idx ON public.provenance USING btree (place_id);


--
-- Name: raw_records_h3_index_r9_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX raw_records_h3_index_r9_idx ON public.raw_records USING btree (h3_index_r9);


--
-- Name: raw_records_intake_batch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX raw_records_intake_batch_id_idx ON public.raw_records USING btree (intake_batch_id);


--
-- Name: raw_records_is_processed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX raw_records_is_processed_idx ON public.raw_records USING btree (is_processed);


--
-- Name: raw_records_name_normalized_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX raw_records_name_normalized_idx ON public.raw_records USING btree (name_normalized);


--
-- Name: raw_records_placekey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX raw_records_placekey_idx ON public.raw_records USING btree (placekey);


--
-- Name: raw_records_source_name_external_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX raw_records_source_name_external_id_key ON public.raw_records USING btree (source_name, external_id);


--
-- Name: resolution_links_golden_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resolution_links_golden_record_id_idx ON public.resolution_links USING btree (golden_record_id);


--
-- Name: resolution_links_raw_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resolution_links_raw_record_id_idx ON public.resolution_links USING btree (raw_record_id);


--
-- Name: resolution_links_resolution_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resolution_links_resolution_type_idx ON public.resolution_links USING btree (resolution_type);


--
-- Name: restaurant_groups_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX restaurant_groups_slug_idx ON public.restaurant_groups USING btree (slug);


--
-- Name: restaurant_groups_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX restaurant_groups_slug_key ON public.restaurant_groups USING btree (slug);


--
-- Name: restaurant_groups_visibility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX restaurant_groups_visibility_idx ON public.restaurant_groups USING btree (visibility);


--
-- Name: review_audit_log_queue_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_audit_log_queue_id_idx ON public.review_audit_log USING btree (queue_id);


--
-- Name: review_audit_log_resolved_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_audit_log_resolved_at_idx ON public.review_audit_log USING btree (resolved_at);


--
-- Name: review_queue_canonical_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_queue_canonical_id_idx ON public.review_queue USING btree (canonical_id);


--
-- Name: review_queue_identity_enrichment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_queue_identity_enrichment_status_idx ON public.review_queue USING btree (identity_enrichment_status);


--
-- Name: review_queue_priority_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_queue_priority_status_idx ON public.review_queue USING btree (priority, status);


--
-- Name: review_queue_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_queue_status_idx ON public.review_queue USING btree (status);


--
-- Name: sanction_conflicts_attribute_key_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sanction_conflicts_attribute_key_status_idx ON public.sanction_conflicts USING btree (attribute_key, status);


--
-- Name: sanction_conflicts_entity_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sanction_conflicts_entity_id_status_idx ON public.sanction_conflicts USING btree (entity_id, status);


--
-- Name: sanction_conflicts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sanction_conflicts_status_idx ON public.sanction_conflicts USING btree (status);


--
-- Name: source_registry_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX source_registry_is_active_idx ON public.source_registry USING btree (is_active);


--
-- Name: source_registry_trust_tier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX source_registry_trust_tier_idx ON public.source_registry USING btree (trust_tier);


--
-- Name: sources_trust_tier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sources_trust_tier_idx ON public.sources USING btree (trust_tier);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: viewer_bookmarks_place_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viewer_bookmarks_place_id_idx ON public.viewer_bookmarks USING btree (entity_id);


--
-- Name: viewer_bookmarks_viewer_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viewer_bookmarks_viewer_user_id_idx ON public.viewer_bookmarks USING btree (viewer_user_id);


--
-- Name: viewer_bookmarks_viewer_user_id_place_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX viewer_bookmarks_viewer_user_id_place_id_key ON public.viewer_bookmarks USING btree (viewer_user_id, entity_id);


--
-- Name: winelist_signals_analyzed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX winelist_signals_analyzed_at_idx ON public.winelist_signals USING btree (analyzed_at);


--
-- Name: winelist_signals_golden_record_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX winelist_signals_golden_record_id_key ON public.winelist_signals USING btree (golden_record_id);


--
-- Name: winelist_signals_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX winelist_signals_status_idx ON public.winelist_signals USING btree (status);


--
-- Name: merchant_surfaces merchant_surfaces_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER merchant_surfaces_no_update BEFORE UPDATE ON public.merchant_surfaces FOR EACH ROW EXECUTE FUNCTION public.merchant_surfaces_prevent_update();


--
-- Name: EntityActorRelationship EntityActorRelationship_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntityActorRelationship"
    ADD CONSTRAINT "EntityActorRelationship_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES public."Actor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldsMembership FieldsMembership_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldsMembership"
    ADD CONSTRAINT "FieldsMembership_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TraceSignalsCache TraceSignalsCache_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TraceSignalsCache"
    ADD CONSTRAINT "TraceSignalsCache_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: coverage_sources coverage_sources_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverage_sources
    ADD CONSTRAINT coverage_sources_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gpid_resolution_queue gpid_resolution_queue_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpid_resolution_queue
    ADD CONSTRAINT gpid_resolution_queue_place_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: import_jobs import_jobs_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: import_jobs import_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: instagram_accounts instagram_accounts_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: instagram_media instagram_media_instagram_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_media
    ADD CONSTRAINT instagram_media_instagram_user_id_fkey FOREIGN KEY (instagram_user_id) REFERENCES public.instagram_accounts(instagram_user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lists lists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: locations locations_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: map_places map_places_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_places
    ADD CONSTRAINT map_places_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: map_places map_places_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_places
    ADD CONSTRAINT map_places_place_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: menu_fetches menu_fetches_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_fetches
    ADD CONSTRAINT menu_fetches_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: merchant_surface_artifacts merchant_surface_artifacts_surface_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_surface_artifacts
    ADD CONSTRAINT merchant_surface_artifacts_surface_id_fkey FOREIGN KEY (merchant_surface_id) REFERENCES public.merchant_surfaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: merchant_surface_scans merchant_surface_scans_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_surface_scans
    ADD CONSTRAINT merchant_surface_scans_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: merchant_surfaces merchant_surfaces_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_surfaces
    ADD CONSTRAINT merchant_surfaces_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: operational_overlays operational_overlays_source_signal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_overlays
    ADD CONSTRAINT operational_overlays_source_signal_id_fkey FOREIGN KEY (source_signal_id) REFERENCES public.proposed_signals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: operator_place_candidates operator_place_candidates_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator_place_candidates
    ADD CONSTRAINT operator_place_candidates_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."Actor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: operator_place_candidates operator_place_candidates_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator_place_candidates
    ADD CONSTRAINT operator_place_candidates_place_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: park_facility_relationships park_facility_relationships_child_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_facility_relationships
    ADD CONSTRAINT park_facility_relationships_child_fk FOREIGN KEY (child_entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: park_facility_relationships park_facility_relationships_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_facility_relationships
    ADD CONSTRAINT park_facility_relationships_parent_fk FOREIGN KEY (parent_entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: people people_restaurant_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_restaurant_group_id_fkey FOREIGN KEY (restaurant_group_id) REFERENCES public.restaurant_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: person_places person_places_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_places
    ADD CONSTRAINT person_places_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: person_places person_places_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_places
    ADD CONSTRAINT person_places_place_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: place_actor_relationships place_actor_relationships_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_actor_relationships
    ADD CONSTRAINT place_actor_relationships_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."Actor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: place_actor_relationships place_actor_relationships_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_actor_relationships
    ADD CONSTRAINT place_actor_relationships_place_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: place_appearances place_appearances_host_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_appearances
    ADD CONSTRAINT place_appearances_host_place_id_fkey FOREIGN KEY (host_entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: place_appearances place_appearances_subject_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_appearances
    ADD CONSTRAINT place_appearances_subject_place_id_fkey FOREIGN KEY (subject_entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: place_coverage_status place_coverage_status_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_coverage_status
    ADD CONSTRAINT place_coverage_status_place_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: place_photo_eval place_photo_eval_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_photo_eval
    ADD CONSTRAINT place_photo_eval_place_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entities places_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT places_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: entities places_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT places_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: entities places_restaurant_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT places_restaurant_group_id_fkey FOREIGN KEY (restaurant_group_id) REFERENCES public.restaurant_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reservation_provider_matches reservation_provider_matches_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_provider_matches
    ADD CONSTRAINT reservation_provider_matches_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: resolution_links resolution_links_raw_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resolution_links
    ADD CONSTRAINT resolution_links_raw_record_id_fkey FOREIGN KEY (raw_record_id) REFERENCES public.raw_records(raw_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: review_audit_log review_audit_log_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_audit_log
    ADD CONSTRAINT review_audit_log_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.review_queue(queue_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: review_queue review_queue_raw_id_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_queue
    ADD CONSTRAINT review_queue_raw_id_a_fkey FOREIGN KEY (raw_id_a) REFERENCES public.raw_records(raw_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: review_queue review_queue_raw_id_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_queue
    ADD CONSTRAINT review_queue_raw_id_b_fkey FOREIGN KEY (raw_id_b) REFERENCES public.raw_records(raw_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: viewer_bookmarks viewer_bookmarks_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewer_bookmarks
    ADD CONSTRAINT viewer_bookmarks_place_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: viewer_bookmarks viewer_bookmarks_viewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewer_bookmarks
    ADD CONSTRAINT viewer_bookmarks_viewer_user_id_fkey FOREIGN KEY (viewer_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


