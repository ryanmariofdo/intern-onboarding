# GreenChit — Trade-offs and Design Review

## Setup
Two architectural options are under review:
- Option A: Azure App Service monolith. One deployment for web app holds the API Service, the Notification service, and the React Web app on Azure App Service.
- Option B: Azure Container Apps split. The Web app, API Service, and Notification service run as separate container services, and deployed independently to Azure Container Registry.

## Trade-off Table
| Quality Attribute | Option A: App Service monolith | Option B: Container Apps split | Why |
|---|---|---|---|
| Time-to-first-deploy | 5 | 2 | It is easier to deploy using APp service with a simple command, while Container Apps requires building containers using Docker images and requires more setup before running. |
| Cost (low spend) | 5 | 2 | App Service needs one plan that hosts the whole app, so the bill is small and easy to predict, while Container Apps splits the app into several services plus a container registry and extra monitoring, which adds up for an internal tool with fewer than 50 submissions an hour. |
| Operability for 10-person team | 4 | 3 | With App Service easy to operate where the team checks one log stream and restarts one app, while with Container Apps they must also manage images and several services, which is hard when nobody has run containers in production. |
| Independent deploy | 1 | 5 | With App Service a small fix still redeploys the whole app, while Container Apps lets each service ship on its own without touching the others. |
| Future scaling | 2 | 5 | App Service can only add more copies of the whole app, while Container Apps can scale just the busy service independently, as for App Service it scales everything together. |
| Authn/authz consistency | 4 | 3 | With one app there is a single sign-in and permission setup to get right, while a split means every service must validate Entra ID tokens and apply the same claim access rules, so a mistake in one could leave a gap. |
| **Total** | **21** | **20** |

## Results Summary
| Metric | Target | Achieved |
|--------|--------|----------|
| Quality attributes scored | 6 | 6 |
| Cells with a written justification | 12 | 12 |
| Decision-affecting attributes identified | 2-3 | 2 (time-to-first-deploy & operability gave the decision to go with Azure App Service) |

## Decision and rationale
- Choose Option A, Azure App Service. It scored 21 against 20 for Container Apps.
- The gap is only one point, so we do not decide on the total. We decide on two attributes that matter most to us right now.
- Time-to-first-deploy drove the decision. We have 6 weeks to ship, and App Service lets us deploy with one simple pipeline. Container Apps needs Docker images, a registry, and more setup first.
- Operability for a 10-person team drove the decision. Nobody on the team has run containers in production. One app with one log stream is something we can run safely from day one.
- What we give up: Independent deploy (1 against 5) and future scaling (2 against 5). A small fix redeploys the whole app, and we can only scale everything together. At fewer than 50 submissions an hour, we accept this.

## Design review feedback (received from another pair)
- 3 strengths
- 3 weaknesses or risks
- 2 actionable improvements

## Design review feedback (given to another pair)
- 3 strengths
- 3 weaknesses or risks
- 2 actionable improvements