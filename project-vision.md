# 📘 Project Brief: Personal Document Graph (Bubble App)

## 🔍 Overview

This project aims to build a **cross-platform personal documentation system** that allows users to visually capture, organise, and explore their important life documents and relationships in an intuitive, mind-map-like interface known as the **Document Graph**.

The platform will be accessible via both **mobile and web**, offering a consistent, user-friendly experience across devices.

---

## 🧠 Concept

At its core, the app provides a **2D, zoomable infinite canvas** on which users build a visual representation of their personal records. The graph begins with either:

- a **single individual user**, or  
- a **family entity** (e.g. “The Smith Family”) at the centre.

If a **family entity** is used as the root, it will branch first into individual **family members and pets**, before continuing.

From each **individual node**, the graph then branches outward to their related:

- **Assets** (e.g. vehicles, homes)
- **Categories** (e.g. health, finance, education)
- **Documents** (e.g. contracts, identification, insurance, medical records)

This forms a progressively expanding graph with up to 5+ levels of depth, representing a natural, spatial layout of life’s most important documents and relationships.

The graph interface is intended to feel natural, playful, and spatial — inspired by **mind maps**, but grounded in real-world structure and enhanced with metadata.

---

## 🌳 Hierarchical Node Structure (Default Model)

- **Level 1**: Root node (either a family entity or an individual user)
- **Level 2**: People and pets (if a family root is used)
- **Level 3**: Assets and Categories  
  _Examples_: `House`, `Car`, `Finance`, `Health`, `Work`, `Education`, `Subscriptions`
- **Level 4–5+**:  
  Individual documents and nested subcategories  
  _Example_: `House > Insurance > Policy.pdf`

This hierarchy is a **starting point** — over time, the system will support flexible, user-defined graph structures.

---

## ✨ Key Features

### 🌐 Interactive Document Graph

- Infinite canvas with smooth zooming, panning, and manual node placement
- Nodes connected with **solid (primary)** or **dotted (secondary)** edges
- Grouping, rearranging, and collapsing of nodes
- Hover/tap to view summaries; click to open full documents in a **built-in viewer**

### 🧠 AI & Automation

- **AI document processing** extracts key metadata (e.g. expiry dates, document type, owner)
- Smart document ingestion from:
  - Connected **email accounts** (e.g. Gmail)
  - Uploaded PDFs
  - Scanned **photos**
- **Auto-reminders** for renewals (passports, insurance, rego, etc.)
- **Fuzzy search** with real-time highlighting and deep document preview

### 🔐 Security & Sharing

- Encrypted metadata storage
- Two-factor or biometric authentication
- Audit logging
- Secure **collaboration**:
  - Share whole graphs or sub-graphs with family members
  - Role-based access: read-only or edit access

### 🧩 Extensible Design

- Early focus on household record keeping
- Later support for professional, legal, or caregiving use cases
- Simple light/dark mode at launch, with future UI customisation

---

## 🔐 Auth & Access Model

### 🏗️ Architecture

- The app uses a **multi-tenant architecture**, with each account representing a single **family tenant** (e.g. a household).
- Each family account owns one or more document graphs.
- Up to **5 users** can be associated with a paid family account.
- Each user has a unique login and can be assigned one of the following roles:
  - `Owner` – full control of the account, billing, and sharing
  - `Editor` – can add/edit/delete content in the graph
  - `Viewer` – read-only access to assigned nodes/documents

### 🔑 User Authentication

- Standard email + password login
- OAuth-based social login (e.g. Google, Apple, Microsoft)
- Optional support for **BYOI** (Bring Your Own Identity) via SSO/OIDC for future flexibility
- Two-factor authentication (2FA) supported for enhanced security

### 📁 Document Storage Strategy

- The app does **not store documents directly** in its own infrastructure.
- Users connect their **preferred cloud file storage** (e.g. Google Drive, Dropbox, OneDrive).
- The app retrieves documents **on demand**, using OAuth scopes and file access tokens.
- This approach limits custodianship risks and prioritises user-controlled privacy.

### 🗃️ Metadata Handling

- All information about the user’s document graph is stored in a structured **JSON-based data model**.
- The underlying model is a **node-edge graph**, where:
  - **Nodes** represent all entities in the graph, including:
    - People and pets
    - Assets (e.g. cars, homes)
    - Categories (e.g. health, finance, education)
    - Individual documents (e.g. insurance policies, birth certificates, tax statements)
  - **Edges** represent the relationships between these nodes (e.g. “owns”, “insures”, “linked to”, “belongs to”, “authored by”).

- Each node contains relevant metadata:
  - For people: name, date of birth, role (e.g. primary account holder, dependent)
  - For assets: type, ownership, tags
  - For documents: title, document type, source link, extracted dates (e.g. issue/expiry), associated node(s)

- This graph structure enables:
  - Flexible navigation and visualisation of complex relationships
  - Intelligent linking and suggestions via AI (e.g. "This passport likely belongs to John")
  - Efficient filtering, search, and reminders based on relationships and document state

- All metadata is stored securely in the app’s backend, scoped to the **family tenant**. Document content itself remains in the user’s connected cloud storage.

---

## 🔄 Technical Direction & Considerations

- Core data structure is a **node-edge graph**
- Rendering engine: candidates include (but not limited only):
  - `React Flow` (manual layout & flexibility)
  - `ELK` (e.g. Radial or Force layout)
  - `Highcharts Network Graph` (polished force layout with limits on customisation)
- Document parsing pipeline powered by Claude or other LLM
- Designed for **offline-first**, scalable document syncing model

---

## 🎯 Vision

A digital "life filing cabinet" — but beautiful, relational, and intelligent.

The app will make it easier than ever for people to keep track of everything that matters: family, assets, responsibilities, and deadlines — all in one glance.