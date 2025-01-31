# Bindicator API
### Description

This is an API for the Bindicator Project. 

The API interacts with the provisioning app, as well as a central Firebase database. It offers various functions and tools to sync Bindicators across a single household, change the status of the two lights, and establish a trash and recycling collection schedule.


Additionally, it parses the publicly posted PDF of my hometown's trash and recycling collection calendar.

### Technology Stack
- Node.js (runtime)
- Server.js (dev server)
- Firebase
- Mocha (tests)

### Install

1. Clone the repo
1. Run `npm i`
1. Add a firebase service account credentials in `./config`
1. Run `node .` to start a dev server on `localhost:3000`
 