--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4
-- Dumped by pg_dump version 15.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: authors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.authors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    author_id BIGINT NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft',
    view_count INTEGER DEFAULT 0
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: post_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_tags (
    post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE,
    tag_id BIGINT REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    author_email VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET
);


--
-- Name: post_views; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_views (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    referrer VARCHAR(255)
);


--
-- Data for Name: authors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.authors (name, email, bio, avatar_url) VALUES
('Sarah Johnson', 'sarah@techblog.com', 'Senior software engineer with 10+ years experience in web development', 'https://example.com/avatars/sarah.jpg'),
('Mike Chen', 'mike@techblog.com', 'DevOps specialist and cloud architecture enthusiast', 'https://example.com/avatars/mike.jpg'),
('Emily Rodriguez', 'emily@techblog.com', 'Full-stack developer passionate about PostgreSQL and data modeling', 'https://example.com/avatars/emily.jpg');


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tags (name, description, color) VALUES
('PostgreSQL', 'Articles about PostgreSQL database', '#336791'),
('JavaScript', 'JavaScript programming and frameworks', '#f7df1e'),
('DevOps', 'Development operations and deployment', '#326ce5'),
('Tutorial', 'Step-by-step tutorials and guides', '#28a745'),
('Performance', 'Performance optimization techniques', '#dc3545'),
('Security', 'Database and application security', '#6f42c1');


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.posts (title, slug, content, excerpt, author_id, published_at, status, view_count) VALUES
('Getting Started with PostgreSQL SERIAL Types', 'postgresql-serial-types', 'PostgreSQL provides several serial types for auto-incrementing columns. SERIAL is equivalent to INTEGER with a sequence, while BIGSERIAL uses BIGINT...', 'Learn how to use PostgreSQL SERIAL and BIGSERIAL for auto-incrementing primary keys', 3, '2024-01-15 10:00:00+00', 'published', 1247),
('Advanced JavaScript Async Patterns', 'javascript-async-patterns', 'Modern JavaScript provides powerful asynchronous programming patterns. From callbacks to promises to async/await...', 'Master advanced asynchronous programming techniques in JavaScript', 1, '2024-01-20 14:30:00+00', 'published', 892),
('Docker Best Practices for Development', 'docker-development-best-practices', 'Using Docker effectively in development requires understanding layers, caching, and optimization techniques...', 'Essential Docker practices for efficient development workflows', 2, '2024-01-25 09:15:00+00', 'published', 1034),
('Database Indexing Strategies', 'database-indexing-strategies', 'Proper indexing is crucial for database performance. This article covers B-tree indexes, partial indexes, and composite indexes...', 'Comprehensive guide to PostgreSQL indexing for optimal performance', 3, NULL, 'draft', 0);


--
-- Data for Name: post_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.post_tags (post_id, tag_id) VALUES
(1, 1), (1, 4),
(2, 2), (2, 4),
(3, 3), (3, 4),
(4, 1), (4, 5);


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.comments (post_id, author_name, author_email, content, is_approved) VALUES
(1, 'John Developer', 'john@example.com', 'Great explanation of SERIAL types! This really helped me understand the difference between SERIAL and BIGSERIAL.', true),
(1, 'Alice Smith', 'alice@example.com', 'Thanks for the clear examples. I was confused about sequence ownership before reading this.', true),
(2, 'Bob Wilson', 'bob@example.com', 'The async/await examples are excellent. Could you do a follow-up on error handling?', true),
(3, 'Carol Johnson', 'carol@example.com', 'Docker multi-stage builds section was particularly helpful for our team.', true);


--
-- Data for Name: post_views; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.post_views (post_id, ip_address, user_agent, referrer) VALUES
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://google.com'),
(1, '10.0.0.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'https://twitter.com'),
(2, '172.16.0.25', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', 'https://reddit.com'),
(3, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://google.com');


--
-- Name: authors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.authors_id_seq', 3, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 4, true);


--
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tags_id_seq', 6, true);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 4, true);


--
-- Name: post_views_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.post_views_id_seq', 4, true);


--
-- Name: authors authors_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authors
    ADD CONSTRAINT authors_email_key UNIQUE (email);


--
-- Name: posts posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_slug_key UNIQUE (slug);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: idx_posts_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_author_id ON public.posts USING btree (author_id);


--
-- Name: idx_posts_published_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_published_at ON public.posts USING btree (published_at DESC) WHERE (published_at IS NOT NULL);


--
-- Name: idx_posts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_status ON public.posts USING btree (status);


--
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- Name: idx_post_views_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_views_post_id ON public.post_views USING btree (post_id);


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_views post_views_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
