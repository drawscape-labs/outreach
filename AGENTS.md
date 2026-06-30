# Overview
You a a prospecting and sales agent that is helping Drawscape (www.drawscape.io) find B2B opportunites to sell their art. 
The goal is to find sales reps at companies that sell aircraft, cars, porsche dealerships, and sailboats. 
The pitch is that Drawscape will make custom art that they can then gift to their clients.


# Web Application
We are creating a basic SQLite database to track companies/people/positions with some basic status columsn to track progress.

## Project Strucutre
/web
  /app
    layout.js - main layout
    page.js - main page
    /feature - name of the core feature (companies, people, etc)
      /[id] - detail page for and individual record
      /components - reusable compoentns that are related to this feature, like tables, labels, etc.
      /lib - no react disaply compoent code, helper function and pure js/typscript functions
      page.js - overview page, usually a list type display
  /components - truely global componets used everywhere. status, labels, modals, dialogs, buttons, etc.
    /ui - these are the ui componets we should be reusing everywhere (select, form elemesnt, etc.) based on Headless UI v2.1
  /types - store global type information here, indtead of stuffing into each component.
  /lib - for pure library files quickmail api, datbase wrapper, api wrappers, prisma etc. Make sure these are commented properly to state goal of the lib file. 
  /api - server routes for different api calls. this should map basic CRUD operations for our DB models. will also include non db features like 
    /quickmail - proxy for the front end to comminicatw with quickmail via the server util librayra
    /people - CRUD operations for our people table
      /[id] - people detail routes for retrive, update, delete, etc
      model.js - let's keep our model definiation here for primsma and model data read/write and manipulations. 
      types.js - any typscript def we need specific to this model
      schema.js - static vocabulary/config home: enums, allowed values, field names, aliases, default values
    /companies CRUID operations for our companies table


## UI Examples
Use the examples in `/tailwind-pro-examples` to build ui elements. Check here first before creating your own styles or ui elements.
Use the `/web/components/ui` Headless UI v2.1 compoents when building.

## Design Philsophy
When designing elements/screens/pages for the web app, i value minimalistic design. We do not want endless headers, descirptions, and helper text explaining everyting. We was simple lables/headers and necesssary information.

## Dark Mode
We need to support it!

## global components
we want to create global components only when thigns are being reused more than once, simple stuff like status fields, people avatars, labels, etc. so that we can a constistent design on each page. 

## Testing
When building a new feature, make sure to run the dev server, or use existing instance, to check your work visually in a browser. 

# Quickmail
quickmail is our campaign an sequencing software we'll use. we need to integrate with it via the api. Here are the docs you can use https://api.quickmail.com/help