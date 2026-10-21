# Container Diagram (C4 Level 2)

## How to read the diagram

The member uses the mobile app, which signs in through Entra Microsoft External ID and receives a validated JWT from the API Service.

Solid arrows are synchronous (SYNC): the app calls the API with the JWT, and the API reads and writes SQL to database (Azure SQL), uses the cache to read hot data (Azure Cache for Redis), and stores photos in Azure Blob Storage.

Dashed arrows are asynchronous (ASYNC): the API puts email jobs on the Service Bus queue without waiting, later sends them through Azure Communication Services, so an email outage never blocks a member.

Reading data: the API checks the Redis cache first and only goes to Azure SQL when no cache found.

Photos: they are uploaded as binary data through the API into Blob Storage, and the database keeps only each photo's name.