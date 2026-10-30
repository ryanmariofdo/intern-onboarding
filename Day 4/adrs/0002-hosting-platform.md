# ADR 0002: Host GreenChit on Azure App Service than Container Apps (single web app)

## Status
Accepted (date: 2026-10-29)

## Context
- GreenChit is an internal tool. Only BISTEC staff use it, and we expect fewer than 50 claim submissions in a busy hour.
- The team is early-career. Most of us have used Azure App Service. Nobody has run containers in production.
- We have 6 weeks to ship a working internal release.
- Submitting a claim must take under 1.5 s (p95). The app must be up 99.9% of the time during business hours.
- The brief gives two hosting choices: Azure App Service or Azure Container Apps.
- What decides it for us is how fast we can deploy the first version and how easy it is for a small team to run.
- We don't yet know the real traffic after launch. We also don't know if finance will later want features that need to scale on their own.

## Decision
We host GreenChit on Azure App Service as a single web app.

- The API Service, the Notification service, and the React Web app run on the same App Service plan.
- We run 2 instances, so a restart or an update does not take the app down.
- We use a staging slot and swap it into production after a quick check.
- We use one GitHub Actions pipeline to deploy.
- We write a new ADR if traffic stays above 200 requests per second, or if one part needs to deploy or scale on its own.

## Consequences
- Easier
  - Minimal infrastructure management.
  - Deploying is simple. Push the code and the pipeline ships it. No container images or registry.
  - Logs, Application Insights, and sign-in settings are in one place.
  - The staging slot lets us release with less risk, which helps the 99.9% goal.
- Harder
  - Every change redeploys the whole app. A small fix to notifications still ships everything.
  - We cannot scale one feature alone. We can only add more instances of the whole app.
  - We pay for the plan all day, even at night when nobody uses it.
- Different
  - We will not learn container skills on this project. We plan a small side practice project to cover that.
- Uncomfortable
  - The API Service and the Notification service share the same CPU and memory. If Teams is slow or notifications keep retrying, they can slow down claim submission and break the 1.5 s target.
  - We accept this for now. We watch response time and CPU from day one. If they clash, splitting the Notification service out is our first change.

## Alternatives considered
- Azure Container Apps (split into separate services): rejected. It is better for independent deploys and scaling, but we don't need that at this size. We would also have to learn Docker images, a registry, and more infrastructure setup, which puts our 6-week deadline at risk.
- Azure Functions only: rejected. Cold starts and time limits could break our 1.5 s target. Spreading one claim flow across many small functions is also harder for a new team to debug and secure.
- Azure Kubernetes Service (AKS): rejected. It is far too much to run for a small internal tool and a small team.
