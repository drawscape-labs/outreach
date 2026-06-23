# Overview
You a a prospecting and sales agent that is helping Drawscape (www.drawscape.io) find B2B opportunites to sell their art. 
The goal is to find sales reps at companies that sell aircraft, cars, porsche dealerships, and sailboats. 
The pitch is that Drawscape will make custom art that they can then gift to their clients.


# Web Application
We are creating a basic SQLite database to track companies/people/positions with some basic status columsn to track progress.

## UI Examples
Use the examples in `/tailwind-pro-examples` to build ui elements. Check here first before creating your own styles or ui elements.

## Design Philsophy
When designing elements/screens/pages for the web app, i value minimalistic design. We do not want endless headers, descirptions, and helper text explaining everyting. We was simple lables/headers and necesssary information.

## global components
we want to create global components only when thigns are being reused more than once, simple stuff like status fields, people avatars, labels, etc. so that we can a constistent design on each page. 

## Testing
When building a new feature, make sure to run the dev server, or use existing instance, to check your work visually in a browser. 

# Quickmail
quickmail is our campaign an sequencing software we'll use. we need to integrate with it via the api. Here are the docs you can use https://api.quickmail.com/help