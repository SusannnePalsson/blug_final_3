--
-- PostgreSQL database dump
--

\restrict 3e4gamEPcgMNXNNIStXSUIHUdiRuX5w4g87K1Tu3JCLVNvKGeDoH5ReJ3rZXyaP

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2026-03-15 21:54:39

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
-- TOC entry 2 (class 3079 OID 25140)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- TOC entry 5094 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 25290)
-- Name: forums; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forums (
    id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    created_by bigint NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forums_status_check CHECK ((status = ANY (ARRAY['active'::text, 'blocked'::text, 'deleted'::text])))
);


ALTER TABLE public.forums OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 25289)
-- Name: forums_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.forums_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.forums_id_seq OWNER TO postgres;

--
-- TOC entry 5095 (class 0 OID 0)
-- Dependencies: 223
-- Name: forums_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.forums_id_seq OWNED BY public.forums.id;


--
-- TOC entry 228 (class 1259 OID 25337)
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id bigint NOT NULL,
    thread_id bigint NOT NULL,
    author_user_id bigint NOT NULL,
    text text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT posts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'blocked'::text, 'deleted'::text])))
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 25336)
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

--
-- TOC entry 5096 (class 0 OID 0)
-- Dependencies: 227
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- TOC entry 221 (class 1259 OID 25263)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id smallint NOT NULL,
    name text NOT NULL,
    CONSTRAINT roles_name_check CHECK ((name = ANY (ARRAY['member'::text, 'admin'::text])))
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 25262)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5097 (class 0 OID 0)
-- Dependencies: 220
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 230 (class 1259 OID 25395)
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp with time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 25359)
-- Name: thread_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.thread_members (
    thread_id bigint NOT NULL,
    user_id bigint NOT NULL,
    member_role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT thread_members_member_role_check CHECK ((member_role = ANY (ARRAY['member'::text, 'moderator'::text])))
);


ALTER TABLE public.thread_members OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 25312)
-- Name: threads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.threads (
    id bigint NOT NULL,
    forum_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    owner_user_id bigint NOT NULL,
    visibility text DEFAULT 'public'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT threads_status_check CHECK ((status = ANY (ARRAY['active'::text, 'blocked'::text, 'deleted'::text]))),
    CONSTRAINT threads_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text])))
);


ALTER TABLE public.threads OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 25311)
-- Name: threads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.threads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.threads_id_seq OWNER TO postgres;

--
-- TOC entry 5098 (class 0 OID 0)
-- Dependencies: 225
-- Name: threads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.threads_id_seq OWNED BY public.threads.id;


--
-- TOC entry 222 (class 1259 OID 25274)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id bigint NOT NULL,
    role_id smallint NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 25246)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username public.citext NOT NULL,
    email public.citext NOT NULL,
    password_hash text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'blocked'::text, 'deleted'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 25245)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5099 (class 0 OID 0)
-- Dependencies: 218
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4869 (class 2604 OID 25293)
-- Name: forums id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forums ALTER COLUMN id SET DEFAULT nextval('public.forums_id_seq'::regclass);


--
-- TOC entry 4878 (class 2604 OID 25340)
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- TOC entry 4868 (class 2604 OID 25266)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 4873 (class 2604 OID 25315)
-- Name: threads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threads ALTER COLUMN id SET DEFAULT nextval('public.threads_id_seq'::regclass);


--
-- TOC entry 4864 (class 2604 OID 25249)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5082 (class 0 OID 25290)
-- Dependencies: 224
-- Data for Name: forums; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forums (id, name, slug, description, created_by, status, created_at, updated_at) FROM stdin;
1	Sport	sport	\N	6	active	2025-12-14 22:25:09.377336+01	2025-12-14 22:25:09.377336+01
2	AutoForum	autoforum	\N	6	active	2026-02-25 00:07:44.536773+01	2026-02-25 00:07:44.536773+01
5	Zorro	zorro	\N	1	active	2026-03-01 22:23:47.541015+01	2026-03-01 22:23:47.541015+01
6	Xerxes	xerxes	\N	1	active	2026-03-04 21:37:13.163553+01	2026-03-04 21:37:13.163553+01
7	Qwerty	qwerty	\N	1	active	2026-03-04 21:57:34.835973+01	2026-03-04 21:57:34.835973+01
8	Söndag	sondag	\N	1	active	2026-03-08 21:25:02.35553+01	2026-03-08 21:25:02.35553+01
9	testuserforum1	testuserforum1	\N	6	active	2026-03-11 23:32:23.025421+01	2026-03-11 23:32:23.025421+01
10	testuser2forum	testuser2forum	\N	7	active	2026-03-12 21:47:26.238795+01	2026-03-12 21:47:26.238795+01
11	Testuser4Forum	testuser4privat	\N	11	active	2026-03-15 12:10:37.635366+01	2026-03-15 12:10:37.635366+01
12	ADMINsöndag	adminsondag	\N	1	active	2026-03-15 14:21:04.58314+01	2026-03-15 14:21:04.58314+01
\.


--
-- TOC entry 5086 (class 0 OID 25337)
-- Dependencies: 228
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, thread_id, author_user_id, text, status, created_at, updated_at) FROM stdin;
1	1	6	Detta är mitt första inlägg!	active	2025-12-14 22:29:03.364275+01	2025-12-14 22:29:03.364275+01
2	4	7	Hej! Detta är testuser2:s post i tråd 4.	deleted	2026-02-11 22:11:10.357879+01	2026-02-18 20:39:35.06971+01
3	6	1	Hej! Detta är ett testinlägg.	deleted	2026-02-23 01:21:59.721854+01	2026-02-23 01:26:00.383283+01
4	17	1	Första inlägget\n	active	2026-03-08 22:43:26.306615+01	2026-03-08 22:43:26.306615+01
5	15	1	tjohoo tja	active	2026-03-08 22:43:50.448657+01	2026-03-08 22:44:24.523865+01
6	14	1	In333	active	2026-03-11 20:44:32.232265+01	2026-03-11 20:44:32.232265+01
7	8	1	blaj	active	2026-03-11 22:02:29.557735+01	2026-03-11 22:02:29.557735+01
8	19	6	inlägg1	active	2026-03-11 23:43:27.378959+01	2026-03-11 23:43:27.378959+01
9	18	6	inlägg11	deleted	2026-03-11 23:43:51.680354+01	2026-03-11 23:58:18.961064+01
10	18	6	abc	active	2026-03-12 00:03:56.656851+01	2026-03-12 00:04:05.013944+01
11	19	7	aaa	active	2026-03-12 00:06:14.911613+01	2026-03-12 00:06:14.911613+01
12	19	7	hej	active	2026-03-12 20:52:28.486274+01	2026-03-12 20:52:28.486274+01
13	19	7	zzz	active	2026-03-12 21:44:17.237613+01	2026-03-12 21:44:17.237613+01
14	20	7	user2	active	2026-03-12 21:48:44.441262+01	2026-03-12 21:48:44.441262+01
15	21	6	tjohoo igen 2	active	2026-03-12 21:54:52.48331+01	2026-03-13 21:05:54.3516+01
16	22	7	t23	deleted	2026-03-13 22:09:49.455944+01	2026-03-14 21:08:37.73888+01
18	23	11	t4455	active	2026-03-15 12:38:52.267795+01	2026-03-15 12:46:52.409137+01
19	22	6	t11	active	2026-03-15 15:56:45.933588+01	2026-03-15 15:57:06.116638+01
20	22	12	T5	active	2026-03-15 16:03:55.518266+01	2026-03-15 16:03:55.518266+01
17	22	9	t31hh	active	2026-03-13 22:58:58.783082+01	2026-03-15 17:22:54.159216+01
\.


--
-- TOC entry 5079 (class 0 OID 25263)
-- Dependencies: 221
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name) FROM stdin;
1	member
2	admin
\.


--
-- TOC entry 5088 (class 0 OID 25395)
-- Dependencies: 230
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
\.


--
-- TOC entry 5087 (class 0 OID 25359)
-- Dependencies: 229
-- Data for Name: thread_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.thread_members (thread_id, user_id, member_role, created_at) FROM stdin;
1	6	moderator	2025-12-14 22:26:43.075918+01
3	6	moderator	2026-02-07 23:07:00.249789+01
3	7	member	2026-02-09 20:59:47.364093+01
4	6	moderator	2026-02-09 22:22:36.527399+01
4	7	member	2026-02-09 22:32:25.737769+01
5	1	moderator	2026-02-23 01:16:41.02056+01
6	1	moderator	2026-02-23 01:18:22.096609+01
7	6	moderator	2026-02-25 00:07:44.63076+01
8	6	moderator	2026-02-25 00:25:03.446875+01
9	1	moderator	2026-03-02 00:32:17.177356+01
10	1	moderator	2026-03-02 00:32:56.665417+01
14	1	moderator	2026-03-08 21:24:11.175358+01
15	1	moderator	2026-03-08 21:25:26.60203+01
16	1	moderator	2026-03-08 21:26:26.756482+01
17	1	moderator	2026-03-08 22:02:35.527874+01
18	6	moderator	2026-03-11 23:33:06.475834+01
19	6	moderator	2026-03-11 23:33:40.211654+01
20	7	moderator	2026-03-12 21:47:59.44329+01
21	6	moderator	2026-03-12 21:51:19.895915+01
22	6	moderator	2026-03-13 21:50:08.858289+01
22	7	member	2026-03-13 22:04:48.951507+01
22	9	member	2026-03-13 22:57:48.351876+01
23	11	moderator	2026-03-15 12:17:13.463956+01
23	12	moderator	2026-03-15 12:44:10.859151+01
22	12	member	2026-03-15 15:59:54.053387+01
23	9	member	2026-03-15 19:03:26.08368+01
\.


--
-- TOC entry 5084 (class 0 OID 25312)
-- Dependencies: 226
-- Data for Name: threads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.threads (id, forum_id, title, description, owner_user_id, visibility, status, created_at, updated_at) FROM stdin;
1	1	Min första tråd	Välkommen!	6	public	active	2025-12-14 22:26:43.069664+01	2025-12-14 22:26:43.069664+01
3	1	Privat trad 1	Endast inbjudna ska se detta.	6	private	active	2026-02-07 23:07:00.245646+01	2026-02-07 23:28:22.969976+01
4	1	PrivateThread_A	Only invited users can read.	6	private	active	2026-02-09 22:22:36.522972+01	2026-02-11 23:40:01.522412+01
5	1	E2E tråd	Skapad från Postman	1	public	active	2026-02-23 01:16:41.016405+01	2026-02-23 01:16:41.016405+01
6	1	E2E tråd Nummer 2	Skapad från Postman	1	public	active	2026-02-23 01:18:22.093378+01	2026-02-23 01:18:22.093378+01
7	2	Auto Private Thread	Created by Postman auto-run	6	private	active	2026-02-25 00:07:44.629224+01	2026-02-25 00:07:44.629224+01
8	2	Auto Private Thread	Created by Postman auto-run	6	private	active	2026-02-25 00:25:03.445033+01	2026-02-25 00:25:03.445033+01
9	5	123	abc	1	public	active	2026-03-02 00:32:17.173945+01	2026-03-02 00:32:17.173945+01
10	5	456	def	1	public	active	2026-03-02 00:32:56.663371+01	2026-03-02 00:32:56.663371+01
11	6	X1	X1	1	public	active	2026-03-04 21:37:30.982702+01	2026-03-04 21:37:30.982702+01
12	6	x2	x2	1	public	active	2026-03-04 21:47:31.142164+01	2026-03-04 21:47:31.142164+01
13	7	Q1	Q1	1	public	active	2026-03-04 21:57:46.71295+01	2026-03-04 21:57:46.71295+01
14	5	333	333	1	public	active	2026-03-08 21:24:11.168919+01	2026-03-08 21:24:11.168919+01
15	8	Söndag0308	Söndag0308	1	public	active	2026-03-08 21:25:26.59967+01	2026-03-08 21:25:26.59967+01
16	8	SöndagIgen	SöndagIgen	1	public	active	2026-03-08 21:26:26.754536+01	2026-03-08 21:26:26.754536+01
17	8	popopopoop	poooop	1	public	active	2026-03-08 22:02:35.524789+01	2026-03-08 22:02:35.524789+01
18	9	testuserpubliktråd1	testuserpubliktråd1	6	public	active	2026-03-11 23:33:06.474099+01	2026-03-11 23:33:06.474099+01
19	9	testuserprivattråd1	testuserprivattråd1	6	public	active	2026-03-11 23:33:40.209432+01	2026-03-11 23:33:40.209432+01
20	10	privatuser2	privatuser2	7	private	active	2026-03-12 21:47:59.439327+01	2026-03-12 21:47:59.439327+01
21	9	PRIVATTRÅDIGENUSER1	PRIVATTRÅDIGENUSER1	6	private	active	2026-03-12 21:51:19.892333+01	2026-03-12 21:51:19.892333+01
23	11	Testuser4PRIVATtråd	Testuser4PRIVATtråd	11	private	active	2026-03-15 12:17:13.461686+01	2026-03-15 12:17:13.461686+01
22	9	TrådUser1LördagPrivatATESTUSER	TrådUser1LördagPrivatATESTUSER	6	private	active	2026-03-13 21:50:08.82796+01	2026-03-15 19:00:30.745691+01
\.


--
-- TOC entry 5080 (class 0 OID 25274)
-- Dependencies: 222
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (user_id, role_id) FROM stdin;
1	2
6	1
7	1
9	1
11	1
12	1
13	1
14	1
\.


--
-- TOC entry 5077 (class 0 OID 25246)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, status, created_at, updated_at) FROM stdin;
6	testuser	testuser@blug.se	$argon2id$v=19$m=19456,t=2,p=1$/FqUSRwQ8A3Sfz8hB7sIPA$XXe4RLcR3zJjU27G15v3y8pqzexGD7ppxalc46bn1ac	active	2025-12-14 22:19:44.316711+01	2025-12-14 22:19:44.316711+01
7	testuser2	testuser2@blug.se	$argon2id$v=19$m=19456,t=2,p=1$yqSetgiY/nBGyNpmoOUycw$9iNsm9LPrCvXa3Vtpytfqq2Rt5HCEuKtvhbz0HnM+uk	active	2026-01-31 23:28:35.470517+01	2026-01-31 23:28:35.470517+01
1	admin	admin@blug.local	$argon2id$v=19$m=19456,t=2,p=1$/FqUSRwQ8A3Sfz8hB7sIPA$XXe4RLcR3zJjU27G15v3y8pqzexGD7ppxalc46bn1ac	active	2025-12-14 18:26:02.225929+01	2025-12-14 18:26:02.225929+01
9	testuser3	testuser3@blug.se	$argon2id$v=19$m=19456,t=2,p=1$ycTTAplhPe2nqynIsN9aVA$8aQKDmQv+mCvrFAd8IkRu2MCW+HxandaVZIyjt1JVPY	active	2026-02-22 21:56:37.536493+01	2026-02-22 21:56:37.536493+01
11	testuser4	testuser4@blug.se	$argon2id$v=19$m=19456,t=2,p=1$sV2+M71w1+Tshassj7PiNQ$hcoDo81ThEvki7yEg4i734UarhoBe+1Xz2GVj8RnMHA	active	2026-02-23 01:08:31.67829+01	2026-02-23 01:08:31.67829+01
12	testuser5	testuser5@blug.se	$argon2id$v=19$m=19456,t=2,p=1$dao8kPxqFDEqY4LPnxGznw$dNMGZUnydkmcmtF6Gv2ixhlMcNJ4hn9YsjfbhawvyG4	active	2026-02-25 00:25:03.081096+01	2026-02-25 00:25:03.081096+01
13	testuser6	testuser6@blug.se	$argon2id$v=19$m=19456,t=2,p=1$t/jP9CRQRLaztRn9hwjRAw$RQHO9hzQah/ecanapDwa9aZYNr0FSwb/ngH9x/CWEYQ	active	2026-02-25 01:07:08.423868+01	2026-02-25 01:07:08.423868+01
14	testuser7	testuser7@blug.se	$argon2id$v=19$m=19456,t=2,p=1$o4R1FzktQloO+sJALWT3Rg$VFcB+dQwRNVY8d3+3/LOlaxFkm/30+mwR1oChmpM1gM	active	2026-02-25 01:07:08.509384+01	2026-02-25 01:07:08.509384+01
\.


--
-- TOC entry 5100 (class 0 OID 0)
-- Dependencies: 223
-- Name: forums_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.forums_id_seq', 12, true);


--
-- TOC entry 5101 (class 0 OID 0)
-- Dependencies: 227
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 20, true);


--
-- TOC entry 5102 (class 0 OID 0)
-- Dependencies: 220
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 10, true);


--
-- TOC entry 5103 (class 0 OID 0)
-- Dependencies: 225
-- Name: threads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.threads_id_seq', 23, true);


--
-- TOC entry 5104 (class 0 OID 0)
-- Dependencies: 218
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 14, true);


--
-- TOC entry 4904 (class 2606 OID 25303)
-- Name: forums forums_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_name_key UNIQUE (name);


--
-- TOC entry 4906 (class 2606 OID 25301)
-- Name: forums forums_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_pkey PRIMARY KEY (id);


--
-- TOC entry 4908 (class 2606 OID 25305)
-- Name: forums forums_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_slug_key UNIQUE (slug);


--
-- TOC entry 4915 (class 2606 OID 25348)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- TOC entry 4898 (class 2606 OID 25273)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 4900 (class 2606 OID 25271)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4921 (class 2606 OID 25401)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- TOC entry 4918 (class 2606 OID 25368)
-- Name: thread_members thread_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.thread_members
    ADD CONSTRAINT thread_members_pkey PRIMARY KEY (thread_id, user_id);


--
-- TOC entry 4911 (class 2606 OID 25325)
-- Name: threads threads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threads
    ADD CONSTRAINT threads_pkey PRIMARY KEY (id);


--
-- TOC entry 4902 (class 2606 OID 25278)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- TOC entry 4892 (class 2606 OID 25261)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4894 (class 2606 OID 25257)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4896 (class 2606 OID 25259)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4912 (class 1259 OID 25405)
-- Name: idx_posts_author_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_author_created ON public.posts USING btree (author_user_id, created_at DESC);


--
-- TOC entry 4913 (class 1259 OID 25404)
-- Name: idx_posts_thread_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_thread_created ON public.posts USING btree (thread_id, created_at);


--
-- TOC entry 4919 (class 1259 OID 25402)
-- Name: idx_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_expire ON public.session USING btree (expire);


--
-- TOC entry 4916 (class 1259 OID 25406)
-- Name: idx_thread_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_thread_members_user ON public.thread_members USING btree (user_id);


--
-- TOC entry 4909 (class 1259 OID 25403)
-- Name: idx_threads_forum_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_threads_forum_created ON public.threads USING btree (forum_id, created_at DESC);


--
-- TOC entry 4924 (class 2606 OID 25306)
-- Name: forums forums_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4927 (class 2606 OID 25354)
-- Name: posts posts_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4928 (class 2606 OID 25349)
-- Name: posts posts_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;


--
-- TOC entry 4929 (class 2606 OID 25369)
-- Name: thread_members thread_members_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.thread_members
    ADD CONSTRAINT thread_members_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;


--
-- TOC entry 4930 (class 2606 OID 25374)
-- Name: thread_members thread_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.thread_members
    ADD CONSTRAINT thread_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4925 (class 2606 OID 25326)
-- Name: threads threads_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threads
    ADD CONSTRAINT threads_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- TOC entry 4926 (class 2606 OID 25331)
-- Name: threads threads_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threads
    ADD CONSTRAINT threads_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4922 (class 2606 OID 25284)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- TOC entry 4923 (class 2606 OID 25279)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-03-15 21:54:39

--
-- PostgreSQL database dump complete
--

\unrestrict 3e4gamEPcgMNXNNIStXSUIHUdiRuX5w4g87K1Tu3JCLVNvKGeDoH5ReJ3rZXyaP

