This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# IncidentOps Architecture Principles

IncidentOps is built on a foundation of deterministic, event-driven simulation principles that ensure predictable, reproducible, and scalable incident response training.

## Core Principles

### 1. Deterministic Runtime
- All simulation behavior is predictable and reproducible
- Given the same initial state and actions, the simulation produces identical results
- Enables reliable testing, debugging, and learning assessment
- Uses deterministic seeds for any randomness requirements

### 2. Event-Driven State Mutations Only
- **All state changes occur exclusively through events dispatched via the EventDispatcher**
- No direct state mutations are allowed outside the event system
- Every state change is logged with timestamps and unique IDs
- Provides complete audit trail of all simulation actions
- Enables time-travel debugging and replay capabilities

### 3. Visualization Layer is Read-Only
- The UI layer (React Flow, components) only reads state
- Visualization components cannot mutate simulation state
- All user interactions dispatch events to the simulation engine
- Maintains clean separation between presentation and business logic
- Allows multiple visualization strategies without affecting core logic

### 4. Cloud-Agnostic Simulation Engine
- Infrastructure nodes are provider-agnostic (GCP, AWS, Azure, Generic)
- Service types are abstracted (LoadBalancer, Kubernetes, Database, etc.)
- Scenarios can represent any cloud provider's architecture
- Enables cross-cloud incident training and comparison
- Focuses on universal incident response patterns

### 5. Scenario Cartridges are Modular
- Scenarios are defined as JSON files validated by Zod schemas
- Each cartridge is self-contained with topology, simulation config, pressure, and rewards
- Scenarios can be versioned, shared, and imported independently
- Supports community-contributed incident scenarios
- Easy to create custom training scenarios for specific needs

### 6. Tick-Based Simulation Timing
- Simulation progresses in discrete time steps (ticks)
- Each tick executes registered handlers in deterministic order
- Configurable tick interval allows speed control
- Enables pause, resume, and step-through debugging
- Provides consistent timing for pressure escalation and recovery

## Architecture Benefits

- **Testability**: Deterministic behavior enables comprehensive unit and integration testing
- **Debuggability**: Complete event logs allow precise incident replay and analysis
- **Scalability**: Modular architecture supports complex multi-service scenarios
- **Extensibility**: New node types, actions, and scenarios can be added without core changes
- **Educational Value**: Reproducible scenarios ensure consistent learning experiences
- **Performance**: Event-driven architecture minimizes unnecessary re-renders and computations

## Technology Stack

- **Next.js 16** with App Router and TypeScript
- **Zod** for runtime schema validation
- **React Hooks** (useReducer) for state management
- **UUID** for deterministic event identification
- **Tailwind CSS** for styling
- **ReactFlow** for topology visualization (visualization layer only)
- **Framer Motion** for animations (visualization layer only)
