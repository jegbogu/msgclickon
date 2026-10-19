--
-- PostgreSQL database dump
--

\restrict xOx1A6ep3ZoOfaT3lsiERzugbHkVMDgZkwtNjwHS6RMqezWQQTm335yPfwKREuC

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-10-17 17:27:31

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 369047)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 418684)
-- Name: contact; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    email character varying(255),
    birthday date,
    group_name character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contact OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 1008425)
-- Name: email_campaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_campaign (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    campaign_type character varying(50) DEFAULT 'birthday'::character varying NOT NULL,
    subject character varying(500),
    content text NOT NULL,
    signature text,
    header_image_url text,
    footer_image_url text,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    send_time time without time zone,
    timezone character varying(100) DEFAULT 'Africa/Johannesburg'::character varying,
    days_before_birthday integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contacts integer DEFAULT 0 NOT NULL,
    number_of_sent_msg integer DEFAULT 0 NOT NULL,
    next_run timestamp with time zone,
    company_name character varying(255),
    CONSTRAINT email_campaign_days_check CHECK ((days_before_birthday >= 0)),
    CONSTRAINT email_campaign_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'paused'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT email_campaign_type_check CHECK (((campaign_type)::text = 'birthday'::text))
);


ALTER TABLE public.email_campaign OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 1008461)
-- Name: email_campaign_contact; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_campaign_contact (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_campaign_contact OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 1008484)
-- Name: email_campaign_delivery; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_campaign_delivery (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_campaign_delivery_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'sent'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.email_campaign_delivery OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 1008401)
-- Name: email_template; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name character varying(255) NOT NULL,
    subject character varying(500),
    content text NOT NULL,
    signature text,
    header_image_url text,
    footer_image_url text,
    elements jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_system_template boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_template OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 369085)
-- Name: email_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp without time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_verifications OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 1189146)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    channel text NOT NULL,
    recipient text NOT NULL,
    subject text,
    body text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    provider_id text,
    attempts integer DEFAULT 0 NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 1189145)
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 227
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- TOC entry 220 (class 1259 OID 352663)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fullname character varying(100) CONSTRAINT users_name_not_null NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_verified boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 4952 (class 2604 OID 1189149)
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- TOC entry 4967 (class 2606 OID 418697)
-- Name: contact contact_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_pkey PRIMARY KEY (id);


--
-- TOC entry 4975 (class 2606 OID 1008473)
-- Name: email_campaign_contact email_campaign_contact_campaign_id_contact_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign_contact
    ADD CONSTRAINT email_campaign_contact_campaign_id_contact_id_key UNIQUE (campaign_id, contact_id);


--
-- TOC entry 4977 (class 2606 OID 1008471)
-- Name: email_campaign_contact email_campaign_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign_contact
    ADD CONSTRAINT email_campaign_contact_pkey PRIMARY KEY (id);


--
-- TOC entry 4979 (class 2606 OID 1008499)
-- Name: email_campaign_delivery email_campaign_delivery_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign_delivery
    ADD CONSTRAINT email_campaign_delivery_pkey PRIMARY KEY (id);


--
-- TOC entry 4973 (class 2606 OID 1008450)
-- Name: email_campaign email_campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign
    ADD CONSTRAINT email_campaign_pkey PRIMARY KEY (id);


--
-- TOC entry 4971 (class 2606 OID 1008419)
-- Name: email_template email_template_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_template
    ADD CONSTRAINT email_template_pkey PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 369099)
-- Name: email_verifications email_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4981 (class 2606 OID 1189162)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4961 (class 2606 OID 352678)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4963 (class 2606 OID 352676)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4968 (class 1259 OID 1008399)
-- Name: contact_user_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX contact_user_email_unique ON public.contact USING btree (user_id, email) WHERE (email IS NOT NULL);


--
-- TOC entry 4969 (class 1259 OID 1008400)
-- Name: contact_user_phone_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX contact_user_phone_unique ON public.contact USING btree (user_id, phone) WHERE (phone IS NOT NULL);


--
-- TOC entry 4986 (class 2606 OID 1008474)
-- Name: email_campaign_contact email_campaign_contact_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign_contact
    ADD CONSTRAINT email_campaign_contact_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaign(id) ON DELETE CASCADE;


--
-- TOC entry 4987 (class 2606 OID 1008479)
-- Name: email_campaign_contact email_campaign_contact_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign_contact
    ADD CONSTRAINT email_campaign_contact_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contact(id) ON DELETE CASCADE;


--
-- TOC entry 4988 (class 2606 OID 1008500)
-- Name: email_campaign_delivery email_campaign_delivery_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign_delivery
    ADD CONSTRAINT email_campaign_delivery_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaign(id) ON DELETE CASCADE;


--
-- TOC entry 4989 (class 2606 OID 1008505)
-- Name: email_campaign_delivery email_campaign_delivery_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign_delivery
    ADD CONSTRAINT email_campaign_delivery_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contact(id) ON DELETE CASCADE;


--
-- TOC entry 4985 (class 2606 OID 1008451)
-- Name: email_campaign email_campaign_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaign
    ADD CONSTRAINT email_campaign_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4984 (class 2606 OID 1008420)
-- Name: email_template email_template_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_template
    ADD CONSTRAINT email_template_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4983 (class 2606 OID 418702)
-- Name: contact fk_contact_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT fk_contact_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4982 (class 2606 OID 369100)
-- Name: email_verifications fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-10-17 17:27:32

--
-- PostgreSQL database dump complete
--

\unrestrict xOx1A6ep3ZoOfaT3lsiERzugbHkVMDgZkwtNjwHS6RMqezWQQTm335yPfwKREuC

