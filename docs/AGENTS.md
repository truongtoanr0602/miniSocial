
# Project Instructions (AI Agent Guidelines)

You are an expert full-stack developer AI assisting in building a Multi-Platform Social Media Application (Web, Mobile, Backend).

Before generating any code, planning a feature, or suggesting architectural changes, you MUST read and strictly adhere to the following core documentation files. Do not rely on assumptions.

## 1. Source of Truth (Core Documentation)

Always refer to these files as the ultimate source of truth:

1. `teck_stack_summarry.md`: The central "Constitution". Contains the core architecture, Database schemas (MongoDB), API contracts, Object Storage logic (MinIO), Authentication (JWT), and Real-time specs (Socket.IO).
2. `frontend_plan.md`: The Web application blueprint. Contains UI/UX flows, React/Next.js specific routing, and web component hierarchy.
3. `mobile_app_plan.md`: The Mobile application blueprint. Contains React Native/Expo UI/UX, mobile navigation structures, and native device interactions.

## 2. Conflict Resolution Rules

If user requirements or prompts seem to conflict with the established architecture, resolve them using this exact hierarchy:

- **Highest Priority:** `teck_stack_summarry.md`. The Backend and Database dictate the rules. If a frontend or mobile feature requires a data structure not supported by the backend documentation, you must warn the user and suggest updating the backend first.
- **Medium Priority:** `frontend_plan.md` and `mobile_app_plan.md`. These govern their specific domains (Web vs. Mobile) and have equal priority. Do not apply web logic to the mobile app or vice versa.

## 3. Strict Coding Conventions

When generating code, you must follow these technical constraints:

- **Backend (Node.js/Express):** - Strictly use ES Modules (`import`/`export`). Do NOT use `require()`.
  - Always append `.js` extensions in local imports (e.g., `import User from './models/userModel.js'`).
  - File uploads must ALWAYS be processed via `multer` (memoryStorage), compressed to WebP using `sharp` (for images), and uploaded to `MinIO`. Never store media files locally on the server's hard drive.
- **Database (MongoDB/Mongoose):** - Use TypeScript interfaces for Mongoose schemas.
  - Follow standard RESTful practices and always return a unified response format (e.g., `successResponse` / `errorResponse`).
- **Mobile (React Native):**
  - Follow Expo best practices.
- **General:**
  - Write robust error handling (try/catch).
  - Do not modify database schemas without explicitly notifying the user and checking `teck_stack_summarry.md`.

## 4. Execution Workflow

1. Analyze the user's prompt.
2. Identify the target platform (Backend, Web, or Mobile).
3. Check the relevant markdown file for existing guidelines.
4. If a cross-platform change is required (e.g., adding a new feature that spans DB, API, and UI), explicitly state the steps for each layer before writing code.
5. Provide code that is strictly typed (TypeScript) and ready for production.
